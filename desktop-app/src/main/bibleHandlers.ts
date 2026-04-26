// src/main/bibleIpc.ts
import { ipcMain } from 'electron';
import { bibleService } from './bibleService';

export function registerBibleIpc(): void {
  // ── Get all books ──────────────────────────────────────────
  ipcMain.handle('bible-get-books', () => {
    try {
      const books = bibleService.getBooks();
      return { success: true, data: books };
    } catch (err: any) {
      console.error('bible-get-books error:', err);
      return { success: false, error: err.message };
    }
  });

  // ── Get chapter verses ─────────────────────────────────────
  ipcMain.handle('bible-get-chapter', (_event, bookId: number, chapter: number) => {
    try {
      const verses = bibleService.getChapter(bookId, chapter);
      return { success: true, data: verses };
    } catch (err: any) {
      console.error('bible-get-chapter error:', err);
      return { success: false, error: err.message };
    }
  });

  // ── Lookup reference ───────────────────────────────────────
  ipcMain.handle('bible-lookup', (_event, reference: string) => {
    try {
      const result = bibleService.lookup(reference);
      if (result) {
        return { success: true, data: result };
      }
      return { success: false, error: 'Ayat tidak ditemukan' };
    } catch (err: any) {
      console.error('bible-lookup error:', err);
      return { success: false, error: err.message };
    }
  });

  // ── Search text ────────────────────────────────────────────
  ipcMain.handle('bible-search', (_event, query: string, limit: number = 30) => {
    try {
      const results = bibleService.search(query, limit);
      return { success: true, data: results };
    } catch (err: any) {
      console.error('bible-search error:', err);
      return { success: false, error: err.message };
    }
  });

  console.log('✅ Bible IPC handlers registered');
}