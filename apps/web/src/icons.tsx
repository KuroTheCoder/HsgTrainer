import type { FC, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IconVolume: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M3 9v6h4l5 5V4L7 9H3z" />
    <path d="M16 8.5a5 5 0 0 1 0 7" />
    <path d="M19 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const IconShuffle: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M16 3h5v5" />
    <path d="M4 20L21 3" />
    <path d="M21 16v5h-5" />
    <path d="M15 15l6 6" />
    <path d="M4 4l5 5" />
  </svg>
);

export const IconCube: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" />
    <path d="M3.3 7.5L12 12l8.7-4.5" />
    <path d="M12 22V12" />
  </svg>
);

export const IconBrackets: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M9 3H5v18h4" />
    <path d="M15 3h4v18h-4" />
  </svg>
);

export const IconBook: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const IconPen: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export const IconBolt: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

export const IconTarget: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const IconPlus: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconCheck: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconX: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const IconSparkle: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
    <path d="M19 15v4M17 17h4" />
  </svg>
);

export const IconShield: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const IconArrow: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const IconStar: FC<IconProps> = (p) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const IconUser: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconUsers: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconQuote: FC<IconProps> = (p) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M10 7H6a3 3 0 0 0-3 3v7h7v-7H7.5A2.5 2.5 0 0 1 10 7.5V7zm11 0h-4a3 3 0 0 0-3 3v7h7v-7h-3.5a2.5 2.5 0 0 1 2.5-2.5V7z" />
  </svg>
);

export const IconClock: FC<IconProps> = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

/** Section → icon lookup (kept in sync with SectionMeta.icon). */
export const SECTION_ICONS: Record<string, FC<IconProps>> = {
  phonetics: IconVolume,
  lexico: IconShuffle,
  words: IconCube,
  cloze: IconBrackets,
  reading: IconBook,
  writing: IconPen,
};

export function SectionIcon({ icon, ...rest }: IconProps & { icon: string }) {
  const Cmp = SECTION_ICONS[icon] ?? IconBolt;
  return <Cmp {...rest} />;
}
