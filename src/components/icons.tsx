import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const Logo = (props: P) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M3 9a2 2 0 0 1 2-2h1.5l1.2-1.8A1 1 0 0 1 9.5 4.7h5a1 1 0 0 1 .8.5L16.5 7H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
    <path d="m17.5 8 2-2M20 8l-1-1" />
  </svg>
);

export const IconSwitch = (props: P) => (
  <svg {...base(props)}>
    <path d="M5 9a7 7 0 0 1 12-3l2 2" />
    <path d="M19 5v3h-3" />
    <path d="M19 15a7 7 0 0 1-12 3l-2-2" />
    <path d="M5 19v-3h3" />
  </svg>
);

export const IconTune = (props: P) => (
  <svg {...base(props)}>
    <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="13" cy="18" r="2" />
  </svg>
);

export const IconClose = (props: P) => (
  <svg {...base(props)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconDownload = (props: P) => (
  <svg {...base(props)}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconShare = (props: P) => (
  <svg {...base(props)}>
    <path d="M12 15V4m0 0L8 8m4-4 4 4" />
    <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

export const IconBack = (props: P) => (
  <svg {...base(props)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconUpload = (props: P) => (
  <svg {...base(props)}>
    <path d="M12 16V5m0 0L8 9m4-4 4 4" />
    <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
  </svg>
);

export const IconImage = (props: P) => (
  <svg {...base(props)}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.8" />
    <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17m-2-2 1.5-1.5a2 2 0 0 1 2.8 0L21 16" />
  </svg>
);

export const IconTrash = (props: P) => (
  <svg {...base(props)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconCheck = (props: P) => (
  <svg {...base(props)}>
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
);

export const IconBurst = (props: P) => (
  <svg {...base(props)}>
    <rect x="4.5" y="7.5" width="11" height="11" rx="2" />
    <rect x="8.5" y="3.5" width="11" height="11" rx="2" />
  </svg>
);

export const IconChip = (props: P) => (
  <svg {...base(props)}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2" />
  </svg>
);

export const IconGrid = (props: P) => (
  <svg {...base(props)}>
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);
