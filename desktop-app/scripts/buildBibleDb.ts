// buildBibleDb.ts
import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

// ============================================================
// Types
// ============================================================
interface BibleVerse {
  book: string;
  bookAbbr: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  text: string;
}

interface BookInfo {
  name: string;
  abbr: string;
  chapters: number;
}

// ============================================================
// All 66 books of the Bible with alkitab.mobi abbreviations
// ============================================================
const BOOKS: BookInfo[] = [
  // -- Perjanjian Lama (Old Testament) --
  { name: "Kejadian", abbr: "Kej", chapters: 50 },
  { name: "Keluaran", abbr: "Kel", chapters: 40 },
  { name: "Imamat", abbr: "Im", chapters: 27 },
  { name: "Bilangan", abbr: "Bil", chapters: 36 },
  { name: "Ulangan", abbr: "Ul", chapters: 34 },
  { name: "Yosua", abbr: "Yos", chapters: 24 },
  { name: "Hakim-hakim", abbr: "Hak", chapters: 21 },
  { name: "Rut", abbr: "Rut", chapters: 4 },
  { name: "1 Samuel", abbr: "1Sam", chapters: 31 },
  { name: "2 Samuel", abbr: "2Sam", chapters: 24 },
  { name: "1 Raja-raja", abbr: "1Raj", chapters: 22 },
  { name: "2 Raja-raja", abbr: "2Raj", chapters: 25 },
  { name: "1 Tawarikh", abbr: "1Taw", chapters: 29 },
  { name: "2 Tawarikh", abbr: "2Taw", chapters: 36 },
  { name: "Ezra", abbr: "Ezr", chapters: 10 },
  { name: "Nehemia", abbr: "Neh", chapters: 13 },
  { name: "Ester", abbr: "Est", chapters: 10 },
  { name: "Ayub", abbr: "Ayb", chapters: 42 },
  { name: "Mazmur", abbr: "Mzm", chapters: 150 },
  { name: "Amsal", abbr: "Ams", chapters: 31 },
  { name: "Pengkhotbah", abbr: "Pkh", chapters: 12 },
  { name: "Kidung Agung", abbr: "Kid", chapters: 8 },
  { name: "Yesaya", abbr: "Yes", chapters: 66 },
  { name: "Yeremia", abbr: "Yer", chapters: 52 },
  { name: "Ratapan", abbr: "Rat", chapters: 5 },
  { name: "Yehezkiel", abbr: "Yeh", chapters: 48 },
  { name: "Daniel", abbr: "Dan", chapters: 12 },
  { name: "Hosea", abbr: "Hos", chapters: 14 },
  { name: "Yoel", abbr: "Yl", chapters: 3 },
  { name: "Amos", abbr: "Am", chapters: 9 },
  { name: "Obaja", abbr: "Ob", chapters: 1 },
  { name: "Yunus", abbr: "Yun", chapters: 4 },
  { name: "Mikha", abbr: "Mi", chapters: 7 },
  { name: "Nahum", abbr: "Nah", chapters: 3 },
  { name: "Habakuk", abbr: "Hab", chapters: 3 },
  { name: "Zefanya", abbr: "Zef", chapters: 3 },
  { name: "Hagai", abbr: "Hag", chapters: 2 },
  { name: "Zakharia", abbr: "Za", chapters: 14 },
  { name: "Maleakhi", abbr: "Mal", chapters: 4 },

  // -- Perjanjian Baru (New Testament) --
  { name: "Matius", abbr: "Mat", chapters: 28 },
  { name: "Markus", abbr: "Mrk", chapters: 16 },
  { name: "Lukas", abbr: "Luk", chapters: 24 },
  { name: "Yohanes", abbr: "Yoh", chapters: 21 },
  { name: "Kisah Para Rasul", abbr: "Kis", chapters: 28 },
  { name: "Roma", abbr: "Rom", chapters: 16 },
  { name: "1 Korintus", abbr: "1Kor", chapters: 16 },
  { name: "2 Korintus", abbr: "2Kor", chapters: 13 },
  { name: "Galatia", abbr: "Gal", chapters: 6 },
  { name: "Efesus", abbr: "Ef", chapters: 6 },
  { name: "Filipi", abbr: "Flp", chapters: 4 },
  { name: "Kolose", abbr: "Kol", chapters: 4 },
  { name: "1 Tesalonika", abbr: "1Tes", chapters: 5 },
  { name: "2 Tesalonika", abbr: "2Tes", chapters: 3 },
  { name: "1 Timotius", abbr: "1Tim", chapters: 6 },
  { name: "2 Timotius", abbr: "2Tim", chapters: 4 },
  { name: "Titus", abbr: "Tit", chapters: 3 },
  { name: "Filemon", abbr: "Flm", chapters: 1 },
  { name: "Ibrani", abbr: "Ibr", chapters: 13 },
  { name: "Yakobus", abbr: "Yak", chapters: 5 },
  { name: "1 Petrus", abbr: "1Ptr", chapters: 5 },
  { name: "2 Petrus", abbr: "2Ptr", chapters: 3 },
  { name: "1 Yohanes", abbr: "1Yoh", chapters: 5 },
  { name: "2 Yohanes", abbr: "2Yoh", chapters: 1 },
  { name: "3 Yohanes", abbr: "3Yoh", chapters: 1 },
  { name: "Yudas", abbr: "Yud", chapters: 1 },
  { name: "Wahyu", abbr: "Why", chapters: 22 },
];

// ============================================================
// Configuration
// ============================================================
const BASE_URL = "https://alkitab.mobi/tb";
const OUTPUT_DIR = path.join(__dirname, "bible_db");
const DELAY_MS = 500; // delay between requests to be respectful

// ============================================================
// Utility: sleep
// ============================================================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Fetch a single chapter page and parse verses
// ============================================================
async function fetchChapter(
  book: BookInfo,
  bookNumber: number,
  chapter: number
): Promise<BibleVerse[]> {
  const url = `${BASE_URL}/${book.abbr}/${chapter}/`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`  ❌ Failed to fetch ${url} — HTTP ${response.status}`);
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const verses: BibleVerse[] = [];

  // Each verse lives inside <div id="passage-text" class="passage">
  // Structure: <p><span class="reftext"><a name=vN>N</a></span> <span>text</span></p>
  $("#passage-text p").each((_index, el) => {
    const $el = $(el);

    // Find the verse number from <span class="reftext"><a name=vN>
    const refText = $el.find("span.reftext a");
    if (refText.length === 0) return; // skip paragraph titles or empty <p>

    const verseNum = parseInt(refText.text().trim(), 10);
    if (isNaN(verseNum)) return;

    // Get verse text from the sibling <span data-dur="...">
    // There might be multiple text spans in some edge cases,
    // so we gather all text that's NOT inside .reftext or .paragraphtitle
    let verseText = "";

    $el.find("span[data-begin]").each((_i, spanEl) => {
      verseText += $(spanEl).text().trim() + " ";
    });

    // Fallback: if no span[data-begin] found, get all text minus the reftext
    if (!verseText.trim()) {
      const cloned = $el.clone();
      cloned.find("span.reftext").remove();
      cloned.find("span.paragraphtitle").remove();
      verseText = cloned.text().trim();
    }

    verseText = verseText.trim();

    if (verseText) {
      verses.push({
        book: book.name,
        bookAbbr: book.abbr,
        bookNumber,
        chapter,
        verse: verseNum,
        text: verseText,
      });
    }
  });

  return verses;
}

// ============================================================
// Build the entire Bible database
// ============================================================
async function buildBibleDb() {
  console.log("🔨 Building Bible Database from alkitab.mobi...\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allVerses: BibleVerse[] = [];
  const totalChapters = BOOKS.reduce((sum, b) => sum + b.chapters, 0);
  let completedChapters = 0;

  for (let bookIdx = 0; bookIdx < BOOKS.length; bookIdx++) {
    const book = BOOKS[bookIdx];
    const bookNumber = bookIdx + 1;
    const bookVerses: BibleVerse[] = [];

    console.log(
      `📖 [${bookNumber}/${BOOKS.length}] ${book.name} (${book.abbr}) — ${book.chapters} chapters`
    );

    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      try {
        const verses = await fetchChapter(book, bookNumber, chapter);
        bookVerses.push(...verses);
        allVerses.push(...verses);

        completedChapters++;
        const percent = ((completedChapters / totalChapters) * 100).toFixed(1);
        process.stdout.write(
          `  ✅ Chapter ${chapter}/${book.chapters} — ${verses.length} verses (${percent}% total)\r`
        );
      } catch (error) {
        completedChapters++;
        console.error(
          `\n  ❌ Error fetching ${book.abbr} chapter ${chapter}:`,
          error
        );
      }

      // Be respectful with requests
      await sleep(DELAY_MS);
    }

    console.log(
      `\n  📊 ${book.name}: ${bookVerses.length} verses collected\n`
    );

    // Save per-book JSON
    const bookFilePath = path.join(
      OUTPUT_DIR,
      `${String(bookNumber).padStart(2, "0")}_${book.abbr}.json`
    );
    fs.writeFileSync(bookFilePath, JSON.stringify(bookVerses, null, 2), "utf-8");
  }

  // ============================================================
  // Save combined files
  // ============================================================

  // 1. Full Bible JSON
  const fullPath = path.join(OUTPUT_DIR, "bible_full.json");
  fs.writeFileSync(fullPath, JSON.stringify(allVerses, null, 2), "utf-8");
  console.log(`\n💾 Full Bible saved: ${fullPath}`);

  // 2. Metadata / index
  const metadata = {
    translation: "TB (Terjemahan Baru)",
    language: "Indonesian",
    source: "https://alkitab.mobi",
    totalBooks: BOOKS.length,
    totalChapters,
    totalVerses: allVerses.length,
    scrapedAt: new Date().toISOString(),
    books: BOOKS.map((b, i) => ({
      number: i + 1,
      name: b.name,
      abbr: b.abbr,
      chapters: b.chapters,
      verses: allVerses.filter((v) => v.bookNumber === i + 1).length,
    })),
  };

  const metaPath = path.join(OUTPUT_DIR, "metadata.json");
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
  console.log(`📋 Metadata saved: ${metaPath}`);

  // 3. SQLite-friendly CSV
  const csvLines = [
    "book_number,book_name,book_abbr,chapter,verse,text",
    ...allVerses.map(
      (v) =>
        `${v.bookNumber},"${v.book}","${v.bookAbbr}",${v.chapter},${v.verse},"${v.text.replace(/"/g, '""')}"`
    ),
  ];
  const csvPath = path.join(OUTPUT_DIR, "bible_full.csv");
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf-8");
  console.log(`📄 CSV saved: ${csvPath}`);

  // ============================================================
  // Summary
  // ============================================================
  console.log("\n========================================");
  console.log("✅ Bible Database Build Complete!");
  console.log(`   📚 Books:    ${BOOKS.length}`);
  console.log(`   📄 Chapters: ${totalChapters}`);
  console.log(`   📝 Verses:   ${allVerses.length}`);
  console.log(`   📁 Output:   ${OUTPUT_DIR}`);
  console.log("========================================\n");
}

// ============================================================
// Run
// ============================================================
buildBibleDb().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});