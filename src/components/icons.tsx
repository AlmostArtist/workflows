/**
 * §4.6 — one icon set, regular weight, 1.5px stroke, never filled. Category glyphs are
 * drawn to the brief's descriptions rather than pulled from a generic icon package, so
 * each one says something about the pipeline shape it stands for.
 */

export interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function base(size: number, className?: string, strokeWidth = 1.5) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false as const,
  };
}

/* ---- category glyphs (§4.6) ---------------------------------------------- */

export const CategoryGlyph: Record<string, (p: IconProps) => React.JSX.Element> = {
  // A / K — square with a small aperture ring
  aperture: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8v8M8.5 10l7 4" />
    </svg>
  ),
  // B — two overlapping portrait silhouettes
  cast: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="16.5" cy="10.5" r="2.5" />
      <path d="M13.5 19a4.5 4.5 0 0 1 7-3.6" />
    </svg>
  ),
  // C — an orbit arrow around a dot
  orbit: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M19 8.5a8 8 0 1 1-3-3.2" />
      <path d="M19.5 4v4.5H15" />
    </svg>
  ),
  // D — a masked / cutout square
  mask: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 15l4.5-4.5a2 2 0 0 1 2.8 0L15 15" />
      <path d="M14 13.5l1.6-1.6a2 2 0 0 1 2.8 0L21 14.5" />
      <circle cx="9" cy="8" r="1.2" />
    </svg>
  ),
  // E / N — a stacked poster shape
  layout: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="6" y="3" width="14" height="18" rx="2" />
      <path d="M3 6v13a2 2 0 0 0 2 2h1" />
      <path d="M9.5 8h7M9.5 12h7M9.5 16h4" />
    </svg>
  ),
  // F / L — a camera with a loop arrow
  reshoot: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="2.5" y="7" width="13" height="10" rx="2" />
      <path d="M15.5 11l5-3v8l-5-3z" />
      <path d="M6 4.5a4 4 0 0 1 5.5.6" />
      <path d="M11.8 3.2l.2 2.3-2.3-.3" />
    </svg>
  ),
  // G — three stacked segments merging to one
  merge: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M3 5h5M3 12h5M3 19h5" />
      <path d="M8 5c4 0 3 7 7 7M8 12h7M8 19c4 0 3-7 7-7" />
      <rect x="16" y="9.5" width="5" height="5" rx="1.2" />
    </svg>
  ),
  // H — a speech bubble with a play head
  campaign: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M20.5 12.5A7.5 7.5 0 0 1 13 20H8l-4 2.5V17a7.5 7.5 0 0 1 5-14h4a7.5 7.5 0 0 1 7.5 7.5z" />
      <path d="M10.5 8.8l4.5 2.7-4.5 2.7z" />
    </svg>
  ),
  // I / M — a lightning bolt inside a phone frame
  bolt: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M13 7l-3 5h3l-2 5" />
    </svg>
  ),
  // J — a dense grid
  grid: ({ size = 20, className, strokeWidth }: IconProps) => (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
};

export function CategoryIcon({
  icon,
  size = 20,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const G = CategoryGlyph[icon] ?? CategoryGlyph.aperture;
  return <G size={size} className={className} />;
}

/* ---- UI icons ------------------------------------------------------------ */

export const Search = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const Download = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M12 3v12" />
    <path d="M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4 18.5h16" />
  </svg>
);

export const ListView = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const GridView = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
  </svg>
);

export const ChevronDown = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M6 9.5l6 6 6-6" />
  </svg>
);

export const ChevronLeft = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M14.5 6l-6 6 6 6" />
  </svg>
);

export const ChevronRight = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M9.5 6l6 6-6 6" />
  </svg>
);

export const Warning = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M12 4.5l8.5 15h-17z" />
    <path d="M12 10v4" />
    <path d="M12 17.2h.01" />
  </svg>
);

export const Check = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

export const Copy = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </svg>
);

export const Close = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Filter = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);

export const ImageOut = ({ size = 14, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M3.5 17l5-5 4 4 3-2.5 5 4.5" />
  </svg>
);

export const VideoOut = ({ size = 14, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <rect x="2.5" y="5.5" width="13" height="13" rx="2" />
    <path d="M15.5 10.5l6-3.5v10l-6-3.5z" />
  </svg>
);

export const ExternalLink = ({ size = 16, className, strokeWidth }: IconProps) => (
  <svg {...base(size, className, strokeWidth)}>
    <path d="M13.5 4.5H19.5V10.5" />
    <path d="M19.5 4.5L11 13" />
    <path d="M18 14.5v4a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);
