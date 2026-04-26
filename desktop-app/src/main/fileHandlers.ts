// src/main/fileHandlers.ts

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export function registerFileImportHandlers() {
  ipcMain.handle('import-file-dialog', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      title: 'Import Presentation File',
      filters: [
        { name: 'Presentation Files', extensions: ['pdf', 'docx'] },
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'Word Documents', extensions: ['docx'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();
    const buffer = await fs.readFile(filePath);

    return {
      buffer: buffer.toString('base64'), // Send as base64 to renderer
      fileType: ext === '.pdf' ? 'pdf' : 'docx',
      fileName: path.basename(filePath),
    };
  });
}