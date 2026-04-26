// scripts/importJsonToSqlite.ts
// Run: npx tsx scripts/importJsonToSqlite.ts

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Paths
// ============================================================
const DB_PATH = path.join(__dirname, '..', 'resources', 'bible_id.db');
const BIBLE_JSON_DIR = path.join(__dirname, '..', 'scripts/bible_db');

// ============================================================
// Types (matching your JSON structure)
// ============================================================
interface ScrapedVerse {
  book: string;
  bookAbbr: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  text: string;
}

// ============================================================
// Main
// ============================================================
function main() {
  // ── 1. Find all book JSON files ────────────────────────────
  console.log(`📂 Scanning: ${BIBLE_JSON_DIR}\n`);

  const jsonFiles = fs.readdirSync(BIBLE_JSON_DIR)
    .filter(f => /^\d{2}_\w+\.json$/.test(f))  // match 01_Kej.json, 02_Kel.json, etc.
    .sort();

  if (jsonFiles.length === 0) {
    console.error('❌ No book JSON files found!');
    process.exit(1);
  }

  console.log(`📄 Found ${jsonFiles.length} book files\n`);

  // ── 2. Load all verses from individual files ───────────────
  const allVerses: ScrapedVerse[] = [];
  const bookInfos: {
    bookNumber: number; name: string; abbr: string;
    maxChapter: number; verseCount: number;
  }[] = [];

  for (const file of jsonFiles) {
    const filepath = path.join(BIBLE_JSON_DIR, file);
    const verses: ScrapedVerse[] = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    if (verses.length === 0) {
      console.log(`  ⚠️  ${file}: empty`);
      continue;
    }

    allVerses.push(...verses);

    // Derive book info from first verse
    const first = verses[0];
    const maxChapter = Math.max(...verses.map(v => v.chapter));

    bookInfos.push({
      bookNumber: first.bookNumber,
      name: first.book,
      abbr: first.bookAbbr,
      maxChapter,
      verseCount: verses.length,
    });

    console.log(`  📖 ${file} → ${first.book} (${maxChapter} ch, ${verses.length} verses)`);
  }

  console.log(`\n📊 Total: ${bookInfos.length} books, ${allVerses.length} verses\n`);

  // ── 3. Create fresh SQLite database ────────────────────────
  const resourcesDir = path.dirname(DB_PATH);
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('🗑️  Deleted old database');
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // ── 4. Create tables ──────────────────────────────────────
  console.log('📦 Creating tables...');

  db.exec(`
    CREATE TABLE books (
      id          INTEGER PRIMARY KEY,
      name        TEXT    NOT NULL,
      name_short  TEXT    NOT NULL,
      testament   TEXT    NOT NULL,
      chapters    INTEGER NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE verses (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id  INTEGER NOT NULL,
      chapter  INTEGER NOT NULL,
      verse    INTEGER NOT NULL,
      text     TEXT    NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id),
      UNIQUE(book_id, chapter, verse)
    );
  `);

  db.exec(`
    CREATE INDEX idx_verses_book_chapter ON verses(book_id, chapter);
    CREATE INDEX idx_verses_text ON verses(text);
  `);

  // ── 5. Insert books ───────────────────────────────────────
  console.log('\n📚 Inserting books...');

  const insertBook = db.prepare(
    'INSERT INTO books (id, name, name_short, testament, chapters) VALUES (?, ?, ?, ?, ?)'
  );

  const insertAllBooks = db.transaction(() => {
    for (const book of bookInfos) {
      // Books 1-39 = PL (Old Testament), 40-66 = PB (New Testament)
      const testament = book.bookNumber <= 39 ? 'PL' : 'PB';
      insertBook.run(book.bookNumber, book.name, book.abbr, testament, book.maxChapter);
    }
  });
  insertAllBooks();
  console.log(`  ✅ ${bookInfos.length} books inserted`);

  // ── 6. Insert verses ──────────────────────────────────────
  console.log('\n📝 Inserting verses...');

  const insertVerse = db.prepare(
    'INSERT INTO verses (book_id, chapter, verse, text) VALUES (?, ?, ?, ?)'
  );

  const BATCH_SIZE = 1000;
  let inserted = 0;

  for (let i = 0; i < allVerses.length; i += BATCH_SIZE) {
    const batch = allVerses.slice(i, i + BATCH_SIZE);

    const insertBatch = db.transaction(() => {
      for (const v of batch) {
        insertVerse.run(v.bookNumber, v.chapter, v.verse, v.text);
      }
    });
    insertBatch();

    inserted += batch.length;
    const pct = ((inserted / allVerses.length) * 100).toFixed(1);
    process.stdout.write(`  📝 ${inserted}/${allVerses.length} verses (${pct}%)\r`);
  }

  console.log(`\n  ✅ ${inserted} verses inserted`);

  // ── 7. Verify ─────────────────────────────────────────────
  console.log('\n🔍 Verifying...');

  const bookCount = (db.prepare('SELECT COUNT(*) as c FROM books').get() as any).c;
  const verseCount = (db.prepare('SELECT COUNT(*) as c FROM verses').get() as any).c;

  const samples = [
    { bookId: 1,  ch: 1,  v: 1,  label: 'Kejadian 1:1' },
    { bookId: 43, ch: 3,  v: 16, label: 'Yohanes 3:16' },
    { bookId: 19, ch: 23, v: 1,  label: 'Mazmur 23:1' },
    { bookId: 66, ch: 22, v: 21, label: 'Wahyu 22:21' },
  ];

  for (const s of samples) {
    const row = db.prepare(
      `SELECT b.name, v.chapter, v.verse, v.text 
       FROM verses v JOIN books b ON b.id = v.book_id 
       WHERE v.book_id = ? AND v.chapter = ? AND v.verse = ?`
    ).get(s.bookId, s.ch, s.v) as any;

    if (row) {
      console.log(`  ✅ ${s.label}: "${row.text.substring(0, 70)}..."`);
    } else {
      console.log(`  ⚠️  ${s.label}: NOT FOUND`);
    }
  }

  // ── 8. Summary ────────────────────────────────────────────
  const fileSize = (fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(2);

  console.log('\n========================================');
  console.log('✅ Import Complete!');
  console.log(`   📂 Database: ${DB_PATH}`);
  console.log(`   📚 Books:    ${bookCount}`);
  console.log(`   📝 Verses:   ${verseCount}`);
  console.log(`   📏 Size:     ${fileSize} MB`);
  console.log('========================================\n');

  db.close();
}

main();