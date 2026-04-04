// Replace the Open group and Save group in EditorPage.tsx header

// ── Add this import at the top if not already there ──
import { useRef, useState, useEffect } from 'react'; // already imported

// ── Add this component above EditorPage or in a separate file ──────────────

interface DropdownMenuItem {
  label:    string;
  emoji:    string;
  desc?:    string;
  onClick:  () => void;
  disabled?: boolean;
}

interface HeaderDropdownProps {
  label:    string;
  emoji:    string;
  items:    DropdownMenuItem[];
  disabled?: boolean;
  className?: string;
}

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  label, emoji, items, disabled, className = '',
}) => {
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded
                    transition-colors disabled:opacity-50
                    disabled:cursor-not-allowed ${className}`}
      >
        <span>{emoji}</span>
        <span>{label}</span>
        {/* chevron */}
        <svg
          viewBox="0 0 24 24" width="10" height="10" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transition: 'transform 0.15s',
            transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50
                     bg-gray-800 border border-gray-600 rounded-lg
                     shadow-2xl overflow-hidden"
          style={{ minWidth: 200 }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              disabled={item.disabled}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left
                         hover:bg-gray-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed
                         border-b border-gray-700/50 last:border-0"
            >
              <span className="text-base mt-0.5 shrink-0">{item.emoji}</span>
              <div className="min-w-0">
                <div className="text-white text-xs font-medium">{item.label}</div>
                {item.desc && (
                  <div className="text-gray-400 text-[10px] mt-0.5 leading-tight">
                    {item.desc}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
export default HeaderDropdown;