// src/client/components/ImportButton.tsx

import React from 'react';
import { useFileImport } from '../../hooks/useFileImport';
import { parseSlideMarkup } from '../../utils/slideParser';
import { generateSlides } from '../../utils/slideGenerator';
import usePresentationStore from '../../store/usePresentation';

interface ImportButtonProps {
  onImportComplete?: (slideCount: number) => void;
  className?: string;
}

// Simple inline SVG icons (no external dependency)
const FileUpIcon = () => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M12 12v6" />
    <path d="m15 15-3-3-3 3" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export const ImportButton: React.FC<ImportButtonProps> = ({
  onImportComplete,
  className = '',
}) => {
  const { importFile, isImporting, error } = useFileImport();
  const addSlides = usePresentationStore((s) => s.addSlides);

  const handleImport = async () => {
    const result = await importFile();
    if (!result) return;

    const parsed = parseSlideMarkup(result.markup);
    const generated = generateSlides(parsed);

    addSlides(generated);
    onImportComplete?.(generated.length);
  };

  return (
    <div className={className}>
      <button
        onClick={handleImport}
        disabled={isImporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 
                   hover:bg-blue-700 disabled:bg-blue-800 
                   text-white rounded-lg transition-colors"
      >
        {isImporting ? <SpinnerIcon /> : <FileUpIcon />}
        {isImporting ? 'Importing...' : 'Import PDF / DOCX'}
      </button>
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
};