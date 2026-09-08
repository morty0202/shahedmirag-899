/**
 * Appearance preferences: accent color theme + animated background.
 * Applied via data attributes on <html> (CSS lives in index.css) and
 * persisted to localStorage (instant) + user settings on the server.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AmbientBackground from "./AmbientBackground";
import { getSettings, saveSettings } from "../lib/api/settings";

export const ACCENTS = [
  { id: "aurora", name: "شفق (پیشفرض)", swatch: "#6366f1", swatch2: "#22d3ee" },
  { id: "wine", name: "قرمز شرابی", swatch: "#a03550", swatch2: "#efadb9" },
  { id: "forest", name: "سبز جنگلی", swatch: "#2f9e63", swatch2: "#8dccaa" },
  { id: "sunset", name: "نارنجی غروب", swatch: "#f97316", swatch2: "#fdba74" },
  { id: "ocean", name: "آبی اقیانوسی", swatch: "#0891b2", swatch2: "#67e8f9" },
  { id: "rose", name: "گلگون", swatch: "#f43f5e", swatch2: "#fda4af" },
] as const;

export const BACKGROUNDS = [
  { id: "none", name: "ساده", desc: "بدون انیمیشن", preview: "linear-gradient(135deg,#eef2ff,#f5f6f8)" },
  { id: "aurora", name: "شفق شناور", desc: "گویهای نوری آرام", preview: "linear-gradient(135deg,#c7d2fe,#a5f3fc,#f5d0fe)" },
  { id: "stars", name: "ستارهها", desc: "چشمکزن در تاریکی", preview: "linear-gradient(135deg,#1e1b4b,#312e81)" },
  { id: "bubbles", name: "حبابهای نور", desc: "ذرات بالارونده", preview: "linear-gradient(135deg,#e0e7ff,#c7d2fe,#818cf8)" },
  { id: "snow", name: "برف", desc: "دانههای آرام", preview: "linear-gradient(135deg,#f8fafc,#dbeafe)" },
  { id: "mesh", name: "موج رنگی", desc: "گرادیان چرخان", preview: "conic-gradient(from 45deg,#c7d2fe,#a5f3fc,#f5d0fe,#c7d2fe)" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];
type BgId = (typeof BACKGROUNDS)[number]["id"];

const LS_ACCENT = "accent";
const LS_BG = "bg";

const lsGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const lsSet = (key: string, val: string) => {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
};

function applyDom(accent: string, bg: string) {
  document.documentElement.dataset.accent = accent;
  document.documentElement.dataset.bg = bg;
}

interface AppearanceContextValue {
  accent: AccentId;
  bg: BgId;
  setAccent: (id: AccentId) => void;
  setBg: (id: BgId) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(() => (lsGet(LS_ACCENT) as AccentId) || "aurora");
  const [bg, setBgState] = useState<BgId>(() => (lsGet(LS_BG) as BgId) || "none");

  // apply on every change (also on first mount)
  useEffect(() => {
    applyDom(accent, bg);
  }, [accent, bg]);

  // pull saved preferences from the server (best-effort)
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (cancelled) return;
        if (ACCENTS.some((a) => a.id === s.accent)) {
          setAccentState(s.accent as AccentId);
          lsSet(LS_ACCENT, s.accent);
        }
        if (BACKGROUNDS.some((b) => b.id === s.bgStyle)) {
          setBgState(s.bgStyle as BgId);
          lsSet(LS_BG, s.bgStyle);
        }
      })
      .catch(() => {
        /* offline — keep local values */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      accent,
      bg,
      setAccent: (id) => {
        setAccentState(id);
        lsSet(LS_ACCENT, id);
        applyDom(id, bg);
        void saveSettings({ accent: id }).catch(() => {});
      },
      setBg: (id) => {
        setBgState(id);
        lsSet(LS_BG, id);
        applyDom(accent, id);
        void saveSettings({ bgStyle: id }).catch(() => {});
      },
    }),
    [accent, bg]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
      <AmbientBackground variant={bg} />
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside <AppearanceProvider>");
  return ctx;
}