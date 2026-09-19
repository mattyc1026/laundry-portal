/* ==========================================================================
   Themes

   Every theme defines the same custom properties, so switching is a single
   pass over the root element and no theme can render half applied.

   The palettes live here. The moving parts (glow, weather, light, pistons,
   scanlines and so on) live in styles/themes.css, keyed off the
   data-theme attribute, and Multicolor is animated by lib/theme-motion.js.

   `fonts` is a Google Fonts family spec, loaded only when that theme is
   picked so nobody downloads a font they never see.

   Days 1 to 3 are derived from each theme's own accents so the whole week
   responds.
   ========================================================================== */

import { startThemeMotion } from './theme-motion.js';

export const THEME_CATEGORIES = [
  { id: 'core', label: 'Core' },
  { id: 'aesthetic', label: 'Aesthetic' },
];

export const THEMES = {

  /* ---------- core ---------- */
  dark: {
    label: "Dark",
    category: 'core',
    vars: {
      "--accent": "#22c5e0",
      "--accent-light": "#7dd3fc",
      "--accent-rgb": "34,197,224",
      "--accent2": "#a855f7",
      "--accent2-light": "#d8b4fe",
      "--accent2-rgb": "168,85,247",
      "--avail-on": "#111",
      "--banner-a": "#b45309",
      "--banner-b": "#92400e",
      "--banner-body": "#fde68a",
      "--banner-title": "#fef3c7",
      "--bg": "linear-gradient(160deg,#0b0b10,#151522 55%,#0f0f14)",
      "--bg-card": "#1a1a2e",
      "--bg-elevated": "#16213e",
      "--bg-input": "#0c0c12",
      "--bg-input-alt": "#0a0f1e",
      "--border": "#1e293b",
      "--border-rgb": "30,41,59",
      "--border2": "#334155",
      "--danger": "#ef4444",
      "--danger-rgb": "239,68,68",
      "--day4": "#f97316",
      "--day5": "#84cc16",
      "--day6": "#eab308",
      "--day7": "#6ee7b7",
      "--logo-bg": "#fff",
      "--on-color": "#fff",
      "--page-bg": "#0f0f14",
      "--slot-blocked": "#450a0a",
      "--slot-filled": "#1e3a5f",
      "--success": "#22c55e",
      "--text-body": "#f0f0f5",
      "--text-faint": "#475569",
      "--text-heading": "#e2e8f0",
      "--text-muted": "#64748b",
      "--text-secondary": "#94a3b8",
      "--towel-bg": "#14532d",
      "--towel-text": "#4ade80",
      "--warning": "#f59e0b",
    },
  },
  light: {
    label: "Light",
    category: 'core',
    vars: {
      "--accent": "#0891b2",
      "--accent-light": "#0e7490",
      "--accent-rgb": "8,145,178",
      "--accent2": "#9333ea",
      "--accent2-light": "#7e22ce",
      "--accent2-rgb": "147,51,234",
      "--avail-on": "#111",
      "--banner-a": "#fbbf24",
      "--banner-b": "#f59e0b",
      "--banner-body": "#92400e",
      "--banner-title": "#78350f",
      "--bg": "linear-gradient(160deg,#eef2fa,#f7f9fd 55%,#f4f6fb)",
      "--bg-card": "#ffffff",
      "--bg-elevated": "#ffffff",
      "--bg-input": "#eef1f7",
      "--bg-input-alt": "#e4e9f4",
      "--border": "#dde3ee",
      "--border-rgb": "221,227,238",
      "--border2": "#c7cfdf",
      "--danger": "#dc2626",
      "--danger-rgb": "220,38,38",
      "--day4": "#ea580c",
      "--day5": "#65a30d",
      "--day6": "#ca8a04",
      "--day7": "#0d9488",
      "--logo-bg": "#0f172a",
      "--on-color": "#fff",
      "--page-bg": "#f4f6fb",
      "--slot-blocked": "#fecaca",
      "--slot-filled": "#bfdbfe",
      "--success": "#16a34a",
      "--text-body": "#2a3348",
      "--text-faint": "#aab1c0",
      "--text-heading": "#1a2233",
      "--text-muted": "#8891a3",
      "--text-secondary": "#5b6579",
      "--towel-bg": "#dcfce7",
      "--towel-text": "#15803d",
      "--warning": "#d97706",
    },
  },
  pastel: {
    label: "Pastel",
    category: 'core',
    vars: {
      "--accent": "#7fb8c9",
      "--accent-light": "#5f97a8",
      "--accent-rgb": "127,184,201",
      "--accent2": "#c9a3d9",
      "--accent2-light": "#a877bd",
      "--accent2-rgb": "201,163,217",
      "--avail-on": "#4a3f52",
      "--banner-a": "#f0d9a8",
      "--banner-b": "#e8c07d",
      "--banner-body": "#6b5873",
      "--banner-title": "#5b4a63",
      "--bg": "linear-gradient(160deg,#fbf3fc,#fdf7fe 55%,#faf5fb)",
      "--bg-card": "#fdf9fe",
      "--bg-elevated": "#ffffff",
      "--bg-input": "#f3ebf5",
      "--bg-input-alt": "#efe0f2",
      "--border": "#ecdcf0",
      "--border-rgb": "236,220,240",
      "--border2": "#dfc8e8",
      "--danger": "#e59a9a",
      "--danger-rgb": "229,154,154",
      "--day4": "#e8b88a",
      "--day5": "#a8c98a",
      "--day6": "#e0cf8a",
      "--day7": "#8ad0c9",
      "--logo-bg": "#7fb8c9",
      "--on-color": "#4a3f52",
      "--page-bg": "#faf5fb",
      "--slot-blocked": "#f3d9d9",
      "--slot-filled": "#cfe3ea",
      "--success": "#a3c9a8",
      "--text-body": "#6b5873",
      "--text-faint": "#c6bacc",
      "--text-heading": "#5b4a63",
      "--text-muted": "#ab9bb2",
      "--text-secondary": "#8f7d97",
      "--towel-bg": "#d9ecd9",
      "--towel-text": "#5f8f66",
      "--warning": "#e8c07d",
    },
  },
  neon: {
    label: "Neon",
    category: 'core',
    fonts: 'Orbitron:wght@600;800',
    vars: {
      "--accent": "#00f0ff",
      "--accent-light": "#7af8ff",
      "--accent-rgb": "0,240,255",
      "--accent2": "#ff1f8f",
      "--accent2-light": "#ff7ac0",
      "--accent2-rgb": "255,31,143",
      "--avail-on": "#04020a",
      "--banner-a": "#ff1f8f",
      "--banner-b": "#7a1fff",
      "--banner-body": "#ffe6f5",
      "--banner-title": "#ffffff",
      "--bg": "radial-gradient(120% 60% at 50% 110%,#3a0a4a 0%,#12051f 45%,#04020a 75%),linear-gradient(180deg,#04020a,#0a0418)",
      "--bg-card": "#0b0716",
      "--bg-elevated": "#120a22",
      "--bg-input": "#07040f",
      "--bg-input-alt": "#0b0616",
      "--border": "#3b1d5e",
      "--border-rgb": "59,29,94",
      "--border2": "#5b2a8a",
      "--danger": "#ff3860",
      "--danger-rgb": "255,56,96",
      "--day4": "#ff8a1f",
      "--day5": "#b6ff1f",
      "--day6": "#ffe53d",
      "--day7": "#1fffd2",
      "--logo-bg": "#00f0ff",
      "--on-color": "#04020a",
      "--page-bg": "#04020a",
      "--slot-blocked": "#3a0a1e",
      "--slot-filled": "#1a0f3a",
      "--success": "#3dff9a",
      "--text-body": "#f4f0ff",
      "--text-faint": "#6c5a94",
      "--text-heading": "#ffffff",
      "--text-muted": "#9d8ac9",
      "--text-secondary": "#cbbef0",
      "--towel-bg": "#062b1a",
      "--towel-text": "#3dff9a",
      "--warning": "#ffe53d",
    },
  },
  transparent: {
    label: "Transparent",
    category: 'core',
    vars: {
      "--accent": "#5ee7ff",
      "--accent-light": "#5ee7ff",
      "--accent-rgb": "94,231,255",
      "--accent2": "#d09bff",
      "--accent2-light": "#d09bff",
      "--accent2-rgb": "208,155,255",
      "--avail-on": "#0a0a1a",
      "--banner-a": "rgba(208,155,255,0.35)",
      "--banner-b": "rgba(94,231,255,0.35)",
      "--banner-body": "#f2ecff",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(160deg,#2b0a4a,#0a1a4a 55%,#3a0a3a)",
      "--bg-card": "rgba(255,255,255,0.07)",
      "--bg-elevated": "rgba(255,255,255,0.10)",
      "--bg-input": "rgba(0,0,0,0.25)",
      "--bg-input-alt": "rgba(0,0,0,0.3)",
      "--border": "rgba(255,255,255,0.22)",
      "--border-rgb": "255,255,255",
      "--border2": "rgba(255,255,255,0.32)",
      "--danger": "#ff6b8a",
      "--danger-rgb": "255,107,138",
      "--day4": "#ffb366",
      "--day5": "#c6ff8f",
      "--day6": "#ffe98f",
      "--day7": "#8fffe0",
      "--logo-bg": "#ffffff",
      "--on-color": "#0a0a1a",
      "--page-bg": "#2b0a4a",
      "--slot-blocked": "rgba(255,107,138,0.25)",
      "--slot-filled": "rgba(94,231,255,0.25)",
      "--success": "#6bffb3",
      "--text-body": "#f2ecff",
      "--text-faint": "#8f7bb3",
      "--text-heading": "#ffffff",
      "--text-muted": "#b6a3d6",
      "--text-secondary": "#d6c9f0",
      "--towel-bg": "rgba(107,255,179,0.2)",
      "--towel-text": "#6bffb3",
      "--warning": "#ffd97a",
    },
  },
  bw: {
    label: "Black & White",
    category: 'core',
    vars: {
      "--accent": "#e5e5e5",
      "--accent-light": "#e5e5e5",
      "--accent-rgb": "229,229,229",
      "--accent2": "#a8a8a8",
      "--accent2-light": "#a8a8a8",
      "--accent2-rgb": "168,168,168",
      "--avail-on": "#0a0a0a",
      "--banner-a": "#2b2b2b",
      "--banner-b": "#141414",
      "--banner-body": "#d4d4d4",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(160deg,#050505,#141414 55%,#0a0a0a)",
      "--bg-card": "#121212",
      "--bg-elevated": "#161616",
      "--bg-input": "#1c1c1c",
      "--bg-input-alt": "#141414",
      "--border": "#3a3a3a",
      "--border-rgb": "58,58,58",
      "--border2": "#525252",
      "--danger": "#f5f5f5",
      "--danger-rgb": "245,245,245",
      "--day4": "#cfcfcf",
      "--day5": "#9a9a9a",
      "--day6": "#e5e5e5",
      "--day7": "#7a7a7a",
      "--logo-bg": "#f5f5f5",
      "--on-color": "#0a0a0a",
      "--page-bg": "#0a0a0a",
      "--slot-blocked": "#050505",
      "--slot-filled": "#2e2e2e",
      "--success": "#d4d4d4",
      "--text-body": "#f2f2f2",
      "--text-faint": "#5c5c5c",
      "--text-heading": "#ffffff",
      "--text-muted": "#8f8f8f",
      "--text-secondary": "#c7c7c7",
      "--towel-bg": "#262626",
      "--towel-text": "#f5f5f5",
      "--warning": "#bdbdbd",
    },
  },
  multicolor: {
    label: "Multicolor",
    category: 'core',
    animated: true,
    vars: {
      "--accent": "#ff4d8f",
      "--accent-light": "#ff9cc0",
      "--accent-rgb": "255,77,143",
      "--accent2": "#4dd6ff",
      "--accent2-light": "#a3eaff",
      "--accent2-rgb": "77,214,255",
      "--avail-on": "#0b0618",
      "--banner-a": "#ff4d8f",
      "--banner-b": "#7a5cff",
      "--banner-body": "#fff4fb",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(160deg,#0b0618,#160c2e 55%,#0b0618)",
      "--bg-card": "#140b26",
      "--bg-elevated": "#1b1033",
      "--bg-input": "#0d0720",
      "--bg-input-alt": "#100a26",
      "--border": "#3d2a5c",
      "--border-rgb": "61,42,92",
      "--border2": "#54397d",
      "--danger": "#ff5c5c",
      "--danger-rgb": "255,92,92",
      "--day4": "#ffb84d",
      "--day5": "#a8ff4d",
      "--day6": "#ffe94d",
      "--day7": "#4dffd6",
      "--logo-bg": "#ffd75c",
      "--on-color": "#0b0618",
      "--page-bg": "#0b0618",
      "--slot-blocked": "#4a1a2a",
      "--slot-filled": "#2a1a4a",
      "--success": "#5cff8f",
      "--text-body": "#f5eaff",
      "--text-faint": "#7a68a0",
      "--text-heading": "#ffffff",
      "--text-muted": "#a693c6",
      "--text-secondary": "#d3c2ef",
      "--towel-bg": "#1a4a2a",
      "--towel-text": "#5cff8f",
      "--warning": "#ffd75c",
    },
  },

  /* ---------- aesthetic ---------- */
  ocean: {
    label: "Ocean",
    category: 'aesthetic',
    vars: {
      "--accent": "#3ee6d0",
      "--accent-light": "#9af5ea",
      "--accent-rgb": "62,230,208",
      "--accent2": "#4d9fff",
      "--accent2-light": "#9cc8ff",
      "--accent2-rgb": "77,159,255",
      "--avail-on": "#021526",
      "--banner-a": "#0e7a8c",
      "--banner-b": "#0a3d6e",
      "--banner-body": "#d5f4ff",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(180deg,#0b6d8a 0%,#07466b 22%,#042a4a 52%,#021526 78%,#01070f 100%)",
      "--bg-card": "#06243a",
      "--bg-elevated": "#082c46",
      "--bg-input": "#031828",
      "--bg-input-alt": "#041d30",
      "--border": "#0f4a66",
      "--border-rgb": "15,74,102",
      "--border2": "#1a6a8a",
      "--danger": "#ff6b6b",
      "--danger-rgb": "255,107,107",
      "--day4": "#ff9f6b",
      "--day5": "#9be86a",
      "--day6": "#ffd166",
      "--day7": "#6bf0ff",
      "--logo-bg": "#3ee6d0",
      "--on-color": "#021526",
      "--page-bg": "#042a4a",
      "--slot-blocked": "#3a1422",
      "--slot-filled": "#0a3a58",
      "--success": "#3ee6a0",
      "--text-body": "#e0f7ff",
      "--text-faint": "#5a91a8",
      "--text-heading": "#f2fdff",
      "--text-muted": "#7fb8cc",
      "--text-secondary": "#a9dcec",
      "--towel-bg": "#073d36",
      "--towel-text": "#5cf2c7",
      "--warning": "#ffd166",
    },
  },
  sunset: {
    label: "Sunset",
    category: 'aesthetic',
    fonts: 'Playfair+Display:ital,wght@1,700',
    vars: {
      "--accent": "#ff8a4c",
      "--accent-light": "#ffb98f",
      "--accent-rgb": "255,138,76",
      "--accent2": "#ff4d8d",
      "--accent2-light": "#ff9cbf",
      "--accent2-rgb": "255,77,141",
      "--avail-on": "#1a0b2e",
      "--banner-a": "#ff7b3a",
      "--banner-b": "#b8336a",
      "--banner-body": "#fff0e6",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(180deg,#0e0628 0%,#2a0f52 18%,#5a1a6e 36%,#a8306e 54%,#e8545a 68%,#ff8a4c 80%,#ffc35c 92%,#ffe29a 100%)",
      "--bg-card": "#2a1238",
      "--bg-elevated": "#341646",
      "--bg-input": "#1c0a28",
      "--bg-input-alt": "#220d30",
      "--border": "#5a2b58",
      "--border-rgb": "90,43,88",
      "--border2": "#7a3a6e",
      "--danger": "#ff4d5e",
      "--danger-rgb": "255,77,94",
      "--day4": "#ffb35c",
      "--day5": "#c6e86a",
      "--day6": "#ffd86b",
      "--day7": "#ff9ecb",
      "--logo-bg": "#ffc35c",
      "--on-color": "#1a0b2e",
      "--page-bg": "#2a0f52",
      "--slot-blocked": "#4a1022",
      "--slot-filled": "#4a1f4a",
      "--success": "#7ee8a2",
      "--text-body": "#fff0e6",
      "--text-faint": "#a87a92",
      "--text-heading": "#ffffff",
      "--text-muted": "#d3a3b2",
      "--text-secondary": "#f3c9c0",
      "--towel-bg": "#3d2a0a",
      "--towel-text": "#ffc35c",
      "--warning": "#ffc35c",
    },
  },
  cyberpunk: {
    label: "Cyberpunk",
    category: 'aesthetic',
    fonts: 'Orbitron:wght@600;800',
    vars: {
      "--accent": "#ff2a9d",
      "--accent-light": "#ff8cc8",
      "--accent-rgb": "255,42,157",
      "--accent2": "#ff5ce1",
      "--accent2-light": "#ffa3ef",
      "--accent2-rgb": "255,92,225",
      "--avail-on": "#0d0210",
      "--banner-a": "#ff2a9d",
      "--banner-b": "#9d1fff",
      "--banner-body": "#ffe6f5",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(180deg,#0d0210 0%,#1f0520 50%,#3a0a33 100%)",
      "--bg-card": "#1a0619",
      "--bg-elevated": "#230a22",
      "--bg-input": "#120312",
      "--bg-input-alt": "#170517",
      "--border": "#6a1a5c",
      "--border-rgb": "106,26,92",
      "--border2": "#9a2a86",
      "--danger": "#ff3b3b",
      "--danger-rgb": "255,59,59",
      "--day4": "#ff4fa8",
      "--day5": "#ff7ac2",
      "--day6": "#e04dff",
      "--day7": "#ff9ecf",
      "--logo-bg": "#ff2a9d",
      "--on-color": "#0d0210",
      "--page-bg": "#0d0210",
      "--slot-blocked": "#3a0a14",
      "--slot-filled": "#3a0a33",
      "--success": "#5cffb0",
      "--text-body": "#ffe6f5",
      "--text-faint": "#a3578a",
      "--text-heading": "#ffffff",
      "--text-muted": "#d27aae",
      "--text-secondary": "#ffb3dc",
      "--towel-bg": "#3a3200",
      "--towel-text": "#fff05a",
      "--warning": "#fff05a",
    },
  },
  aurora: {
    label: "Aurora",
    category: 'aesthetic',
    vars: {
      "--accent": "#3dffa8",
      "--accent-light": "#8dffcf",
      "--accent-rgb": "61,255,168",
      "--accent2": "#b36bff",
      "--accent2-light": "#d6adff",
      "--accent2-rgb": "179,107,255",
      "--avail-on": "#030a14",
      "--banner-a": "#128a64",
      "--banner-b": "#5a2eb8",
      "--banner-body": "#e6fff5",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(180deg,#01040a 0%,#030b18 45%,#061a2c 80%,#0a2436 100%)",
      "--bg-card": "#071a2a",
      "--bg-elevated": "#0a2236",
      "--bg-input": "#04101c",
      "--bg-input-alt": "#061524",
      "--border": "#133a4f",
      "--border-rgb": "19,58,79",
      "--border2": "#1d5670",
      "--danger": "#ff5c8a",
      "--danger-rgb": "255,92,138",
      "--day4": "#ff9f7a",
      "--day5": "#b8ff6b",
      "--day6": "#ffe07a",
      "--day7": "#6be8ff",
      "--logo-bg": "#3dffa8",
      "--on-color": "#030a14",
      "--page-bg": "#030a14",
      "--slot-blocked": "#3a1428",
      "--slot-filled": "#0a3040",
      "--success": "#3dffa8",
      "--text-body": "#e6fff5",
      "--text-faint": "#5a9486",
      "--text-heading": "#ffffff",
      "--text-muted": "#7fbcaa",
      "--text-secondary": "#a8e6d0",
      "--towel-bg": "#0a3a2a",
      "--towel-text": "#3dffa8",
      "--warning": "#ffe07a",
    },
  },
  vaporwave: {
    label: "Vaporwave",
    category: 'aesthetic',
    fonts: 'Monoton&family=Orbitron:wght@600;800',
    vars: {
      "--accent": "#01cdfe",
      "--accent-light": "#7ae8ff",
      "--accent-rgb": "1,205,254",
      "--accent2": "#ff71ce",
      "--accent2-light": "#ffaee3",
      "--accent2-rgb": "255,113,206",
      "--avail-on": "#1a0b33",
      "--banner-a": "#ff71ce",
      "--banner-b": "#7a3cff",
      "--banner-body": "#fff0fb",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(180deg,#12062a 0%,#2b0f54 30%,#5a1a7a 55%,#b8409a 72%,#ff71ce 84%,#ffb3a0 100%)",
      "--bg-card": "#241046",
      "--bg-elevated": "#2e1558",
      "--bg-input": "#170a2e",
      "--bg-input-alt": "#1c0d38",
      "--border": "#5a3590",
      "--border-rgb": "90,53,144",
      "--border2": "#7a4db8",
      "--danger": "#ff4f6d",
      "--danger-rgb": "255,79,109",
      "--day4": "#ff9d5c",
      "--day5": "#b9ff66",
      "--day6": "#fffb96",
      "--day7": "#b967ff",
      "--logo-bg": "#fffb96",
      "--on-color": "#1a0b33",
      "--page-bg": "#2b0f54",
      "--slot-blocked": "#4a1030",
      "--slot-filled": "#3a1a6a",
      "--success": "#05ffa1",
      "--text-body": "#f5e6ff",
      "--text-faint": "#8f73b8",
      "--text-heading": "#ffffff",
      "--text-muted": "#b39ad6",
      "--text-secondary": "#dcc2ff",
      "--towel-bg": "#0a3a3f",
      "--towel-text": "#05ffa1",
      "--warning": "#fffb96",
    },
  },
  terminal: {
    label: "Terminal",
    category: 'aesthetic',
    fonts: 'VT323',
    vars: {
      "--accent": "#33ff33",
      "--accent-light": "#7dff7d",
      "--accent-rgb": "51,255,51",
      "--accent2": "#22cc22",
      "--accent2-light": "#66e066",
      "--accent2-rgb": "34,204,34",
      "--avail-on": "#000000",
      "--banner-a": "#062a06",
      "--banner-b": "#031503",
      "--banner-body": "#33ff33",
      "--banner-title": "#7dff7d",
      "--bg": "radial-gradient(130% 110% at 50% 45%,#031a03 0%,#010801 60%,#000000 100%)",
      "--bg-card": "#020b02",
      "--bg-elevated": "#041204",
      "--bg-input": "#000000",
      "--bg-input-alt": "#010801",
      "--border": "#1f6b1f",
      "--border-rgb": "31,107,31",
      "--border2": "#2f9a2f",
      "--danger": "#ffb000",
      "--danger-rgb": "255,176,0",
      "--day4": "#7dff7d",
      "--day5": "#1fe01f",
      "--day6": "#b0ff4d",
      "--day7": "#3dffb0",
      "--logo-bg": "#33ff33",
      "--on-color": "#000000",
      "--page-bg": "#000000",
      "--slot-blocked": "#1a0e00",
      "--slot-filled": "#062a06",
      "--success": "#33ff33",
      "--text-body": "#33ff33",
      "--text-faint": "#1f991f",
      "--text-heading": "#8cff8c",
      "--text-muted": "#22bb22",
      "--text-secondary": "#2ee62e",
      "--towel-bg": "#0d330d",
      "--towel-text": "#b0ff4d",
      "--warning": "#ffb000",
    },
  },
  macintosh: {
    label: "Macintosh",
    category: 'aesthetic',
    fonts: 'Pixelify+Sans:wght@400;600;700',
    vars: {
      "--accent": "#000000",
      "--accent-light": "#333333",
      "--accent-rgb": "0,0,0",
      "--accent2": "#000000",
      "--accent2-light": "#333333",
      "--accent2-rgb": "0,0,0",
      "--avail-on": "#ffffff",
      "--banner-a": "#ffffff",
      "--banner-b": "#ffffff",
      "--banner-body": "#000000",
      "--banner-title": "#000000",
      "--bg": "repeating-conic-gradient(#000000 0% 25%, #ffffff 0% 50%) 0 0 / 4px 4px",
      "--bg-card": "#ffffff",
      "--bg-elevated": "#ffffff",
      "--bg-input": "#ffffff",
      "--bg-input-alt": "#ffffff",
      "--border": "#000000",
      "--border-rgb": "0,0,0",
      "--border2": "#000000",
      "--danger": "#000000",
      "--danger-rgb": "0,0,0",
      "--day4": "#000000",
      "--day5": "#3a3a3a",
      "--day6": "#5a5a5a",
      "--day7": "#1a1a1a",
      "--logo-bg": "#ffffff",
      "--on-color": "#ffffff",
      "--page-bg": "#ffffff",
      "--slot-blocked": "#000000",
      "--slot-filled": "#dddddd",
      "--success": "#000000",
      "--text-body": "#000000",
      "--text-faint": "#555555",
      "--text-heading": "#000000",
      "--text-muted": "#3d3d3d",
      "--text-secondary": "#1f1f1f",
      "--towel-bg": "#000000",
      "--towel-text": "#ffffff",
      "--warning": "#000000",
    },
  },
  candy: {
    label: "Candy",
    category: 'aesthetic',
    vars: {
      "--accent": "#ff5fa2",
      "--accent-light": "#ffa2c9",
      "--accent-rgb": "255,95,162",
      "--accent2": "#6bcbff",
      "--accent2-light": "#a9e0ff",
      "--accent2-rgb": "107,203,255",
      "--avail-on": "#ffffff",
      "--banner-a": "#ff5fa2",
      "--banner-b": "#6bcbff",
      "--banner-body": "#f6f6ff",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(165deg,#fff5fa,#ffe9f3 55%,#eaf4ff)",
      "--bg-card": "#ffffff",
      "--bg-elevated": "#fff0f7",
      "--bg-input": "#fffcfd",
      "--bg-input-alt": "#fffafc",
      "--border": "#d7d7d9",
      "--border-rgb": "215,215,217",
      "--border2": "#bababc",
      "--danger": "#ff4d6d",
      "--danger-rgb": "255,77,109",
      "--day4": "#ff5fa2",
      "--day5": "#6bcbff",
      "--day6": "#c77dff",
      "--day7": "#ffb703",
      "--logo-bg": "#ff5fa2",
      "--on-color": "#ffffff",
      "--page-bg": "#fff5fa",
      "--slot-blocked": "#ffcdd6",
      "--slot-filled": "#ffcfe3",
      "--success": "#3ddc97",
      "--text-body": "#28272d",
      "--text-faint": "#b5aeb4",
      "--text-heading": "#170f19",
      "--text-muted": "#918b91",
      "--text-secondary": "#625f65",
      "--towel-bg": "#ccedff",
      "--towel-text": "#bce7ff",
      "--warning": "#ffb703",
    },
  },

  barbie: {
    label: "Barbie",
    category: 'aesthetic',
    fonts: 'Playfair+Display:ital,wght@0,800;1,800;1,900',
    vars: {
      "--accent": "#e0218a",
      "--accent-light": "#ff5cb0",
      "--accent-rgb": "224,33,138",
      "--accent2": "#d4a017",
      "--accent2-light": "#f5cf5a",
      "--accent2-rgb": "212,160,23",
      "--avail-on": "#ffffff",
      "--banner-a": "#e0218a",
      "--banner-b": "#ff66b8",
      "--banner-body": "#fff0f7",
      "--banner-title": "#ffffff",
      "--bg": "linear-gradient(160deg,#ff1f8e 0%,#ff4fa8 30%,#ff85c2 60%,#ffc2e0 85%,#fff0d6 100%)",
      "--bg-card": "#fff5fa",
      "--bg-elevated": "#ffe6f2",
      "--bg-input": "#ffffff",
      "--bg-input-alt": "#fff0f7",
      "--border": "#f0b8d4",
      "--border-rgb": "240,184,212",
      "--border2": "#e59ac0",
      "--danger": "#d6002f",
      "--danger-rgb": "214,0,47",
      "--day4": "#ff4fa3",
      "--day5": "#d4a017",
      "--day6": "#b36bff",
      "--day7": "#ff85c2",
      "--logo-bg": "#e0218a",
      "--on-color": "#ffffff",
      "--page-bg": "#ff4fa8",
      "--slot-blocked": "#ffc2d6",
      "--slot-filled": "#ffd6ea",
      "--success": "#1f9e5c",
      "--text-body": "#4a0a2e",
      "--text-faint": "#b0527f",
      "--text-heading": "#3a0024",
      "--text-muted": "#9a3a6c",
      "--text-secondary": "#7a1a4c",
      "--towel-bg": "#fff3c4",
      "--towel-text": "#8a6400",
      "--warning": "#c98a00",
    },
  },
};

/* ==========================================================================
   Readability

   Themes are hand picked palettes, so some of them put a badge colour on a
   background it cannot be read against. Rather than hand tuning every palette
   and hoping, the readable colours are computed from the palette itself
   every time a theme is applied.

   Targets WCAG AA, 4.5:1 for text.
   ========================================================================== */

const AA = 4.5;

function toRgb(value) {
  let h = String(value || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

function luminance(rgb) {
  const s = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function blend(a, b, t) {
  return a.map((v, i) => v + (b[i] - a[i]) * t);
}

/** Black or white, whichever is more readable on this background. */
function readableOn(background, fallback = '#ffffff') {
  const bg = toRgb(background);
  if (!bg) return fallback;
  const white = [255, 255, 255];
  const black = [10, 12, 18];
  return contrast(bg, white) >= contrast(bg, black) ? '#ffffff' : toHex(black);
}

/**
 * Nudges a colour toward whichever pole gives contrast until it clears the
 * target. Keeps the theme's own hue wherever the palette already works, and
 * only intervenes where it does not.
 */
function ensureContrast(foreground, background, target = AA) {
  const fg = toRgb(foreground);
  const bg = toRgb(background);
  if (!fg || !bg) return foreground;
  if (contrast(fg, bg) >= target) return foreground;

  const pole = toRgb(readableOn(background));
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const candidate = blend(fg, pole, t);
    if (contrast(candidate, bg) >= target) return toHex(candidate);
  }
  return toHex(pole);
}

/**
 * A mid tone accent can be unreadable against both white and black, so no
 * choice of text colour fixes it. In that case the badge surface itself is
 * darkened or lightened until readable text is possible, keeping the hue.
 */
function badgeSurface(color) {
  const rgb = toRgb(color);
  if (!rgb) return { bg: color, fg: '#ffffff' };

  const white = [255, 255, 255];
  const black = [10, 12, 18];
  const towardWhite = contrast(rgb, black) >= contrast(rgb, white);
  const pole = towardWhite ? white : black;
  const away = towardWhite ? black : white;

  let surface = rgb;
  for (let t = 0; t <= 1.0001; t += 0.06) {
    surface = blend(rgb, pole, t);
    if (contrast(surface, away) >= AA + 0.15) break;
  }
  return { bg: toHex(surface), fg: toHex(away) };
}

/**
 * Derived variables the components use for anything sitting on a coloured
 * surface. Computed per theme so no palette can produce an unreadable badge.
 */
function derivedContrast(v) {
  const card = v['--bg-card'];
  const accent = badgeSurface(v['--accent']);
  const accent2 = badgeSurface(v['--accent2']);
  const danger = badgeSurface(v['--danger']);
  return {
    '--accent-badge': accent.bg,
    '--accent2-badge': accent2.bg,
    '--danger-badge': danger.bg,
    '--on-accent': accent.fg,
    '--on-accent2': accent2.fg,
    '--on-danger': danger.fg,
    '--on-towel': ensureContrast(v['--towel-text'], v['--towel-bg']),
    '--on-input': ensureContrast(v['--text-secondary'], v['--bg-input']),
    // Secondary text tiers, pulled up only where the palette falls short.
    '--text-muted-safe': ensureContrast(v['--text-muted'], card),
    '--text-faint-safe': ensureContrast(v['--text-faint'], card, 4.0),
  };
}

export const DEFAULT_THEME = 'dark';

/** Weekday colours 1 to 3, derived so every theme covers the full week. */
function fillWeekdayColours(vars) {
  return {
    '--day1': vars['--accent'],
    '--day2': vars['--accent2'],
    '--day3': vars['--accent-light'],
  };
}

export function themesIn(category) {
  return Object.entries(THEMES)
    .filter(([, t]) => t.category === category)
    .map(([id, t]) => ({ id, ...t }));
}

/** The handful of variables a preview swatch needs, without applying it. */
export function previewOf(id) {
  const theme = THEMES[id] || THEMES[DEFAULT_THEME];
  return {
    background: theme.vars['--bg'],
    card: theme.vars['--bg-card'],
    border: theme.vars['--border'],
    dots: [theme.vars['--accent'], theme.vars['--accent2'], theme.vars['--danger']],
  };
}

/**
 * Applies a theme to the document. Unknown ids fall back to the default
 * rather than leaving the previous theme partly overwritten.
 */
export function applyTheme(id) {
  const resolved = THEMES[id] ? id : DEFAULT_THEME;
  const theme = THEMES[resolved];
  const root = document.documentElement;
  const all = {
    ...theme.vars,
    ...fillWeekdayColours(theme.vars),
    ...derivedContrast(theme.vars),
  };
  Object.entries(all).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
  root.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.vars['--page-bg']);
  loadThemeFont(theme.fonts);
  startThemeMotion(resolved, all);
  return resolved;
}

/** Adds a theme's Google Font the first time that theme is used. */
function loadThemeFont(spec) {
  if (!spec || typeof document.createElement !== 'function') return;
  const id = `theme-font-${spec.replace(/[^a-z0-9]/gi, '')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
}

/** Accessibility settings live on the root alongside the theme. */
export function applyAccessibility({ textScale = 1, highContrast = false, reduceMotion = false }) {
  const root = document.documentElement;
  root.style.setProperty('--text-scale', String(textScale));
  root.dataset.contrast = highContrast ? 'high' : 'normal';
  root.dataset.motion = reduceMotion ? 'reduced' : 'full';
}
