// src/main/bibleService.ts
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// ============================================================
// Types
// ============================================================
interface ScrapedVerse {
  book: string;
  bookAbbr: string;
  bookNumber: number;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleBook {
  id: number;
  name: string;
  name_short: string;
  testament: string;
  chapters: number;
}

interface BibleVerse {
  book_id: number;
  book_name: string;
  book_short: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleSearchResult {
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

interface BibleLookupResult {
  reference: string;
  verses: BibleVerse[];
  text: string;
  slideText: string;
}

// ============================================================
// Bible Data Store (loaded once, kept in memory)
// ============================================================
class BibleService {
  private books: BibleBook[] = [];
  private verses: BibleVerse[] = [];
  private loaded = false;

  // ── Find the bible_db folder ─────────────────────────────
  private getJsonDir(): string {
    // Try multiple possible locations
    const candidates = [
      path.join(__dirname, '..', '..', 'bible_db'),                    // dev: src/main/../../bible_db
      path.join(__dirname, '..', 'bible_db'),                          // dev alt
      path.join(process.cwd(), 'bible_db'),                            // project root
      path.join(process.cwd(), 'scripts', 'bible_db'),                 // scripts folder
      path.join(app.getAppPath(), 'bible_db'),                         // packaged app
      path.join(app.getAppPath(), '..', 'bible_db'),                   // packaged alt
      path.join(app.isPackaged ? process.resourcesPath : process.cwd(), 'bible_db'), // resources
    ];

    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => /^\d{2}_\w+\.json$/.test(f));
        if (files.length > 0) {
          console.log(`📂 Bible JSON found at: ${dir} (${files.length} files)`);
          return dir;
        }
      }
    }

    throw new Error(
      `❌ Bible JSON files not found! Searched:\n${candidates.map(c => `  - ${c}`).join('\n')}`
    );
  }

  // ── Load all JSON files into memory ───────────────────────
  load(): void {
    if (this.loaded) return;

    const jsonDir = this.getJsonDir();
    const jsonFiles = fs.readdirSync(jsonDir)
      .filter(f => /^\d{2}_\w+\.json$/.test(f))
      .sort();

    console.log(`📖 Loading ${jsonFiles.length} Bible books...`);

    const bookMap = new Map<number, {
      name: string; abbr: string; maxChapter: number; verseCount: number;
    }>();

    for (const file of jsonFiles) {
      const filepath = path.join(jsonDir, file);
      const rawVerses: ScrapedVerse[] = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

      for (const v of rawVerses) {
        // Convert to UI format
        this.verses.push({
          book_id: v.bookNumber,
          book_name: v.book,
          book_short: v.bookAbbr,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text,
        });

        // Track book info
        const existing = bookMap.get(v.bookNumber);
        if (!existing) {
          bookMap.set(v.bookNumber, {
            name: v.book,
            abbr: v.bookAbbr,
            maxChapter: v.chapter,
            verseCount: 1,
          });
        } else {
          if (v.chapter > existing.maxChapter) existing.maxChapter = v.chapter;
          existing.verseCount++;
        }
      }
    }

    // Build books array
    this.books = [...bookMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([id, info]) => ({
        id,
        name: info.name,
        name_short: info.abbr,
        testament: id <= 39 ? 'PL' : 'PB',
        chapters: info.maxChapter,
      }));

    this.loaded = true;
    console.log(`✅ Bible loaded: ${this.books.length} books, ${this.verses.length} verses`);
  }

  // ── Get all books ─────────────────────────────────────────
  getBooks(): BibleBook[] {
    this.load();
    return this.books;
  }

  // ── Get chapter verses ────────────────────────────────────
  getChapter(bookId: number, chapter: number): BibleVerse[] {
    this.load();
    return this.verses.filter(
      v => v.book_id === bookId && v.chapter === chapter
    );
  }

  // ── Search text ───────────────────────────────────────────
  search(query: string, limit: number = 30): BibleSearchResult[] {
    this.load();
    const lower = query.toLowerCase();
    const results: BibleSearchResult[] = [];

    for (const v of this.verses) {
      if (results.length >= limit) break;

      if (v.text.toLowerCase().includes(lower)) {
        results.push({
          book_id: v.book_id,
          book_name: v.book_name,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text,
          reference: `${v.book_name} ${v.chapter}:${v.verse}`,
        });
      }
    }

    return results;
  }

  // ── Parse & lookup a reference string ─────────────────────
  lookup(refString: string): BibleLookupResult | null {
    this.load();

    const parsed = this.parseReference(refString);
    if (!parsed) return null;

    const { book, chapter, verseStart, verseEnd } = parsed;

    let matchedVerses: BibleVerse[];

    if (verseStart !== null && verseEnd !== null) {
      // Range: e.g., "Roma 8:28-30"
      matchedVerses = this.verses.filter(
        v => v.book_id === book.id && v.chapter === chapter &&
             v.verse >= verseStart && v.verse <= verseEnd
      );
    } else if (verseStart !== null) {
      // Single verse: e.g., "Yohanes 3:16"
      matchedVerses = this.verses.filter(
        v => v.book_id === book.id && v.chapter === chapter && v.verse === verseStart
      );
    } else {
      // Whole chapter: e.g., "Mazmur 23"
      matchedVerses = this.verses.filter(
        v => v.book_id === book.id && v.chapter === chapter
      );
    }

    if (matchedVerses.length === 0) return null;

    // Build reference string
    let reference: string;
    if (verseStart !== null && verseEnd !== null) {
      reference = `${book.name} ${chapter}:${verseStart}-${verseEnd}`;
    } else if (verseStart !== null) {
      reference = `${book.name} ${chapter}:${verseStart}`;
    } else {
      reference = `${book.name} ${chapter}`;
    }

    // Build slide text
    const slideLines = [
      `# ${reference}`,
      ...matchedVerses.map(v => `${v.verse}  ${v.text}`),
    ];

    return {
      reference,
      verses: matchedVerses,
      text: matchedVerses.map(v => v.text).join(' '),
      slideText: slideLines.join('\n'),
    };
  }

  // ── Reference parser ──────────────────────────────────────
  private parseReference(ref: string): {
    book: BibleBook;
    chapter: number;
    verseStart: number | null;
    verseEnd: number | null;
  } | null {
    // Normalize
    const input = ref.trim();

    // Build aliases map for flexible matching
    const aliases = this.buildAliasMap();

    // Patterns to try:
    // "Yohanes 3:16"       → book=Yohanes, ch=3, v=16
    // "Yoh 3:16"           → book=Yoh, ch=3, v=16
    // "Roma 8:28-30"       → book=Roma, ch=8, v=28-30
    // "Mazmur 23"          → book=Mazmur, ch=23
    // "1 Korintus 13:4-7"  → book=1 Korintus, ch=13, v=4-7
    // "1Kor 13:4-7"        → book=1Kor, ch=13, v=4-7

    // Regex: capture book name (may start with digit), chapter, optional verse/range
    const match = input.match(
      /^(\d?\s*[A-Za-z\-]+(?:\s+[A-Za-z\-]+)*)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/i
    );

    if (!match) return null;

    const bookInput = match[1].trim();
    const chapter = parseInt(match[2], 10);
    const verseStart = match[3] ? parseInt(match[3], 10) : null;
    const verseEnd = match[4] ? parseInt(match[4], 10) : null;

    // Find the book
    const bookLower = bookInput.toLowerCase().replace(/\s+/g, ' ');
    const bookId = aliases.get(bookLower);

    if (bookId === undefined) return null;

    const book = this.books.find(b => b.id === bookId);
    if (!book) return null;

    return { book, chapter, verseStart, verseEnd };
  }

  // ── Build alias map for book name matching ────────────────
  private buildAliasMap(): Map<string, number> {
    const map = new Map<string, number>();

    for (const book of this.books) {
      const id = book.id;

      // Full name: "Kejadian", "1 Raja-raja", "Kisah Para Rasul"
      map.set(book.name.toLowerCase(), id);

      // Short name: "Kej", "1Raj", "Kis"
      map.set(book.name_short.toLowerCase(), id);

      // Without spaces in numbered books: "1samuel" → "1 Samuel"
      const noSpace = book.name.toLowerCase().replace(/\s+/g, '');
      map.set(noSpace, id);

      const shortNoSpace = book.name_short.toLowerCase().replace(/\s+/g, '');
      map.set(shortNoSpace, id);
    }

    // ── Extra common aliases ──────────────────────────────
    const extras: Record<string, number> = {
      // Indonesian common variations
      'kej': 1, 'kejadian': 1,
      'kel': 2, 'keluaran': 2,
      'im': 3, 'imamat': 3,
      'bil': 4, 'bilangan': 4,
      'ul': 5, 'ulangan': 5,
      'yos': 6, 'yosua': 6,
      'hak': 7, 'hakim-hakim': 7, 'hakim': 7,
      'rut': 8,
      '1sam': 9, '1 sam': 9, '1 samuel': 9,
      '2sam': 10, '2 sam': 10, '2 samuel': 10,
      '1raj': 11, '1 raj': 11, '1 raja-raja': 11, '1 raja': 11,
      '2raj': 12, '2 raj': 12, '2 raja-raja': 12, '2 raja': 12,
      '1taw': 13, '1 taw': 13, '1 tawarikh': 13,
      '2taw': 14, '2 taw': 14, '2 tawarikh': 14,
      'ezr': 15, 'ezra': 15,
      'neh': 16, 'nehemia': 16,
      'est': 17, 'ester': 17,
      'ayb': 18, 'ayub': 18,
      'mzm': 19, 'mazmur': 19,
      'ams': 20, 'amsal': 20,
      'pkh': 21, 'pengkhotbah': 21,
      'kid': 22, 'kidung agung': 22, 'kidung': 22,
      'yes': 23, 'yesaya': 23,
      'yer': 24, 'yeremia': 24,
      'rat': 25, 'ratapan': 25,
      'yeh': 26, 'yehezkiel': 26,
      'dan': 27, 'daniel': 27,
      'hos': 28, 'hosea': 28,
      'yl': 29, 'yoel': 29,
      'am': 30, 'amos': 30,
      'ob': 31, 'obaja': 31,
      'yun': 32, 'yunus': 32,
      'mi': 33, 'mikha': 33,
      'nah': 34, 'nahum': 34,
      'hab': 35, 'habakuk': 35,
      'zef': 36, 'zefanya': 36,
      'hag': 37, 'hagai': 37,
      'za': 38, 'zakharia': 38,
      'mal': 39, 'maleakhi': 39,
      'mat': 40, 'matius': 40,
      'mrk': 41, 'markus': 41,
      'luk': 42, 'lukas': 42,
      'yoh': 43, 'yohanes': 43,
      'kis': 44, 'kisah para rasul': 44, 'kisah': 44,
      'rom': 45, 'roma': 45,
      '1kor': 46, '1 kor': 46, '1 korintus': 46,
      '2kor': 47, '2 kor': 47, '2 korintus': 47,
      'gal': 48, 'galatia': 48,
      'ef': 49, 'efesus': 49,
      'flp': 50, 'filipi': 50,
      'kol': 51, 'kolose': 51,
      '1tes': 52, '1 tes': 52, '1 tesalonika': 52,
      '2tes': 53, '2 tes': 53, '2 tesalonika': 53,
      '1tim': 54, '1 tim': 54, '1 timotius': 54,
      '2tim': 55, '2 tim': 55, '2 timotius': 55,
      'tit': 56, 'titus': 56,
      'flm': 57, 'filemon': 57,
      'ibr': 58, 'ibrani': 58,
      'yak': 59, 'yakobus': 59,
      '1ptr': 60, '1 ptr': 60, '1 petrus': 60, '1pet': 60,
      '2ptr': 61, '2 ptr': 61, '2 petrus': 61, '2pet': 61,
      '1yoh': 62, '1 yoh': 62, '1 yohanes': 62,
      '2yoh': 63, '2 yoh': 63, '2 yohanes': 63,
      '3yoh': 64, '3 yoh': 64, '3 yohanes': 64,
      'yud': 65, 'yudas': 65,
      'why': 66, 'wahyu': 66,
    };

    for (const [alias, id] of Object.entries(extras)) {
      map.set(alias, id);
    }

    return map;
  }
}

// Export singleton
export const bibleService = new BibleService();