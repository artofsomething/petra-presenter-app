// src/renderer/hooks/useFileImport.ts

import { useState, useCallback } from 'react';
import { importPresentationFile, type ImportResult } from '../utils/fileImporter';

interface UseFileImportReturn {
  importFile: () => Promise<ImportResult | null>;
  isImporting: boolean;
  error: string | null;
  lastFileName: string | null;
}

export function useFileImport(): UseFileImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  const importFile = useCallback(async (): Promise<ImportResult | null> => {
    setError(null);
    setIsImporting(true);

    try {
      const result = await importPresentationFile();

      if (!result) {
        setIsImporting(false);
        return null;
      }

      setLastFileName(result.fileName);
      setIsImporting(false);
      return result;
    } catch (err: any) {
      console.error('[useFileImport] Error:', err);
      setError(err.message || 'Failed to import file');
      setIsImporting(false);
      return null;
    }
  }, []);

  return { importFile, isImporting, error, lastFileName };
}