// scripts/populateBibleVerses.ts
// Run once: npx ts-node scripts/populateBibleVerses.ts

import Database from 'better-sqlite3';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '..', 'resources', 'bible_id.db');
const db = new Database(DB_PATH);

const API_BASE = 'https://bible-api.com';

// Map book IDs to bible-api.com book identifiers
const BOOK_API_MAP: Record<number, string> = {
  1: 'genesis', 2: 'exodus', 3: 'leviticus', 4: 'numbers', 5: 'deuteronomy',
  6: 'joshua', 7: 'judges', 8: 'ruth', 9: '1samuel', 10: '2samuel',
  11: '1kings', 12: '2kings', 13: '1chronicles', 14: '2chronicles',
  15: 'ezra', 16: 'nehemiah', 17: 'esther', 18: 'job', 19: 'psalms',
  20: 'proverbs', 21: 'ecclesiastes', 22: 'songofsolomon', 23: 'isaiah',
  24: 'jeremiah', 25: 'lamentations', 26: 'ezekiel', 27: 'daniel',
  28: 'hosea', 29: 'joel', 30: 'amos', 31: 'obadiah', 32: 'jonah',
  33: 'micah', 34: 'nahum', 35: 'habakkuk', 36: 'zephaniah',
  37: 'haggai', 38: 'zechariah', 39: 'malachi',
  40: 'matthew', 41: 'mark', 42: 'luke', 43: 'john', 44: 'acts',
  45: 'romans', 46: '1corinthians', 47: '2corinthians', 48: 'galatians',
  49: 'ephesians', 50: 'philippians', 51: 'colossians',
  52: '1thessalonians', 53: '2thessalonians', 54: '1timothy',
  55: '2timothy', 56: 'titus', 57: 'philemon', 58: 'hebrews',
  59: 'james', 60: '1peter', 61: '2peter', 62: '1john',
  63: '2john', 64: '3john', 65: 'jude', 66: 'revelation',
};

const insertVerse = db.prepare(
  'INSERT OR REPLACE INTO verses (book_id, chapter, verse, text) VALUES (?, ?, ?, ?)'
);

interface BibleApiVerse {
  book_id:    string;
  book_name:  string;
  chapter:    number;
  verse:      number;
  text:       string;
}

interface BibleApiResponse {
  reference:    string;
  verses:       BibleApiVerse[];
  text:         string;
  translation_id: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchChapter(bookApiName: string, chapter: number): Promise<BibleApiVerse[]> {
  const url = `${API_BASE}/${bookApiName}+${chapter}?translation=tb`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠️  HTTP ${res.status} for ${url}`);
      return [];
    }
    const data: BibleApiResponse = await res.json();
    return data.verses || [];
  } catch (err) {
    console.error(`  ❌ Fetch error for ${url}:`, err);
    return [];
  }
}

async function populateAll() {
  const books = db.prepare('SELECT * FROM books ORDER BY id').all() as Array<{
    id: number; name: string; name_short: string; testament: string; chapters: number;
  }>;

  let totalVerses = 0;

  for (const book of books) {
    const apiName = BOOK_API_MAP[book.id];
    if (!apiName) {
      console.warn(`⚠️ No API mapping for book ${book.id} (${book.name})`);
      continue;
    }

    console.log(`\n📖 ${book.name} (${book.chapters} chapters)...`);

    for (let ch = 1; ch <= book.chapters; ch++) {
      const verses = await fetchChapter(apiName, ch);

      if (verses.length === 0) {
        console.log(`  Ch ${ch}: no verses returned`);
        continue;
      }

      const insertBatch = db.transaction(() => {
        for (const v of verses) {
          insertVerse.run(book.id, ch, v.verse, v.text.trim());
          totalVerses++;
        }
      });

      insertBatch();
      console.log(`  Ch ${ch}: ${verses.length} verses`);

      // Rate limiting — be kind to the API
      await sleep(300);
    }
  }

  console.log(`\n✅ Done! Total verses inserted: ${totalVerses}`);
}

populateAll()
  .catch(err => console.error('Fatal error:', err))
  .finally(() => db.close());