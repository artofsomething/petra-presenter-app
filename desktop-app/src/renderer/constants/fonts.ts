export interface FontOption {
  label: string;
  value: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
}

export const FONTS: FontOption[] = [
  // ── System (always available) ──────────────────────────
  { label: 'Arial',             value: 'Arial',             category: 'sans-serif'  },
  { label: 'Arial Black',       value: 'Arial Black',       category: 'display'     },
  { label: 'Verdana',           value: 'Verdana',           category: 'sans-serif'  },
  { label: 'Tahoma',            value: 'Tahoma',            category: 'sans-serif'  },
  { label: 'Trebuchet MS',      value: 'Trebuchet MS',      category: 'sans-serif'  },
  { label: 'Impact',            value: 'Impact',            category: 'display'     },
  { label: 'Comic Sans MS',     value: 'Comic Sans MS',     category: 'handwriting' },
  { label: 'Georgia',           value: 'Georgia',           category: 'serif'       },
  { label: 'Times New Roman',   value: 'Times New Roman',   category: 'serif'       },
  { label: 'Courier New',       value: 'Courier New',       category: 'monospace'   },
  // ── Google / Bundled ───────────────────────────────────
  { label: 'Inter',             value: 'Inter',             category: 'sans-serif'  },
  { label: 'Roboto',            value: 'Roboto',            category: 'sans-serif'  },
  { label: 'Poppins',           value: 'Poppins',           category: 'sans-serif'  },
  { label: 'Montserrat',        value: 'Montserrat',        category: 'sans-serif'  },
  { label: 'Lato',              value: 'Lato',              category: 'sans-serif'  },
  { label: 'Raleway',           value: 'Raleway',           category: 'sans-serif'  },
  { label: 'Nunito',            value: 'Nunito',            category: 'sans-serif'  },
  { label: 'Ubuntu',            value: 'Ubuntu',            category: 'sans-serif'  },
  { label: 'Oswald',            value: 'Oswald',            category: 'display'     },
  { label: 'Bebas Neue',        value: 'Bebas Neue',        category: 'display'     },
  { label: 'Playfair Display',  value: 'Playfair Display',  category: 'serif'       },
  { label: 'Merriweather',      value: 'Merriweather',      category: 'serif'       },
  { label: 'Lora',              value: 'Lora',              category: 'serif'       },
  { label: 'Dancing Script',    value: 'Dancing Script',    category: 'handwriting' },
  { label: 'Pacifico',          value: 'Pacifico',          category: 'handwriting' },
  { label: 'Caveat',            value: 'Caveat',            category: 'handwriting' },
  { label: 'Fira Code',         value: 'Fira Code',         category: 'monospace'   },
  { label: 'Source Code Pro',   value: 'Source Code Pro',   category: 'monospace'   },
];

export const CATEGORY_LABELS: Record<string, string> = {
  'sans-serif':  'Sans Serif',
  'serif':       'Serif',
  'display':     'Display',
  'handwriting': 'Handwriting',
  'monospace':   'Monospace',
};