"use client";

import * as React from "react";

import { msAteAProximaVirada, temaDaHora } from "@/lib/tema-da-hora";

/**
 * `auto` segue a HORA DO DIA (claro das 6h às 18h, escuro fora disso — regra em
 * `lib/tema-da-hora.ts`) e é o padrão de quem nunca escolheu. `system` continua
 * existindo e seguindo o `prefers-color-scheme`: quem já o escolheu não perde a
 * escolha porque o padrão mudou.
 */
export type Theme = "auto" | "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

// Exportada para o teste reusar em vez de duplicar o literal — duplicar
// acionaria `tests/unit/branding.test.ts` (a mesma marca hardcoded, fora da
// lista congelada, num segundo arquivo).
export const STORAGE_KEY = "deskcomm-theme";

type ThemeContextValue = {
  /** User preference: auto (hora do dia), light, dark, or system. */
  theme: Theme;
  /** Effective theme applied to the DOM (auto/system collapsed to light/dark). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "auto";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "auto" || v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // localStorage indisponível (modo privado, sandbox) — segue com default.
  }
  return "auto";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Aplica no `<html>`. A troca é um cross-fade quando o navegador tem View
 * Transitions, a aba está visível e a pessoa não pediu menos movimento — é o
 * que faz a virada das 18h acontecer sem um "piscar" no meio do trabalho.
 *
 * Só troca quando o valor MUDA: no primeiro efeito depois da hidratação o script
 * anti-flash do layout já deixou o atributo certo. Com a aba OCULTA o navegador
 * aborta a transição e as promessas dela rejeitariam sem ninguém ouvir.
 */
function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === resolved) return;
  const swap = () => root.setAttribute("data-theme", resolved);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
  const doc = document as Document & {
    startViewTransition?: (update: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  };
  if (!reduced && document.visibilityState === "visible" && typeof doc.startViewTransition === "function") {
    const transicao = doc.startViewTransition(swap);
    const ignorar = () => {};
    transicao.ready.catch(ignorar);
    transicao.finished.catch(ignorar);
    transicao.updateCallbackDone.catch(ignorar);
  } else {
    swap();
  }
}

/**
 * ═══ POR QUE ISTO É UM EXTERNAL STORE, E NÃO `useState` + `useEffect` ═══
 *
 * A primeira renderização do CLIENTE é a de hidratação — a mesma que o React
 * compara contra o HTML do servidor. `useState(() => readStoredTheme())` lia o
 * `localStorage` nessa passada e divergia do servidor (ícone e `aria-label` do
 * `ThemeToggle`). Com `useSyncExternalStore`, a hidratação vê
 * `getServerSnapshot` dos dois lados e o valor real entra logo depois do commit,
 * sem cascata de renders. Ver `lib/theme.test.tsx`.
 */
type Ouvinte = () => void;
const ouvintesDeTema = new Set<Ouvinte>();
let temaEmCache: Theme | null = null;

function getTemaSnapshot(): Theme {
  if (temaEmCache === null) temaEmCache = readStoredTheme();
  return temaEmCache;
}
function getTemaSnapshotDoServidor(): Theme {
  return "auto";
}
function inscreverEmTema(ouvinte: Ouvinte): () => void {
  ouvintesDeTema.add(ouvinte);
  return () => ouvintesDeTema.delete(ouvinte);
}
function gravarTema(next: Theme) {
  temaEmCache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Persistência opcional — falha silenciosamente.
  }
  ouvintesDeTema.forEach((ouvinte) => ouvinte());
}

const ouvintesDeSistema = new Set<Ouvinte>();
let sistemaEmCache: ResolvedTheme | null = null;

function getSistemaSnapshot(): ResolvedTheme {
  if (sistemaEmCache === null) sistemaEmCache = getSystemTheme();
  return sistemaEmCache;
}
function getSistemaSnapshotDoServidor(): ResolvedTheme {
  return "light";
}
function inscreverEmSistema(ouvinte: Ouvinte): () => void {
  if (ouvintesDeSistema.size === 0 && typeof window !== "undefined") {
    // Só liga UM listener nativo, mesmo com N componentes inscritos — o
    // fan-out para os `ouvinte()` é responsabilidade deste módulo.
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      sistemaEmCache = e.matches ? "dark" : "light";
      ouvintesDeSistema.forEach((o) => o());
    };
    mql.addEventListener("change", onChange);
  }
  ouvintesDeSistema.add(ouvinte);
  return () => ouvintesDeSistema.delete(ouvinte);
}

/**
 * O relógio do modo `auto`, no mesmo desenho de external store: um temporizador
 * até a próxima virada (6h/18h) e uma reconferida quando a aba volta a ficar
 * visível — notebook que dormiu às 17h e acordou às 19h não dispara o
 * temporizador na hora certa, mas dispara `visibilitychange`.
 */
const ouvintesDaHora = new Set<Ouvinte>();
let horaEmCache: ResolvedTheme | null = null;
let desligarRelogio: (() => void) | null = null;

function getHoraSnapshot(): ResolvedTheme {
  if (horaEmCache === null) horaEmCache = temaDaHora();
  return horaEmCache;
}
function getHoraSnapshotDoServidor(): ResolvedTheme {
  return "light";
}
function ligarRelogio(): () => void {
  let timer: number | undefined;
  const conferir = () => {
    const agora = temaDaHora();
    if (agora !== horaEmCache) {
      horaEmCache = agora;
      ouvintesDaHora.forEach((o) => o());
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(conferir, msAteAProximaVirada());
  };
  const aoVoltar = () => {
    if (document.visibilityState === "visible") conferir();
  };
  timer = window.setTimeout(conferir, msAteAProximaVirada());
  document.addEventListener("visibilitychange", aoVoltar);
  window.addEventListener("focus", conferir);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", aoVoltar);
    window.removeEventListener("focus", conferir);
  };
}
function inscreverNaHora(ouvinte: Ouvinte): () => void {
  if (ouvintesDaHora.size === 0 && typeof window !== "undefined") {
    desligarRelogio = ligarRelogio();
  }
  ouvintesDaHora.add(ouvinte);
  return () => {
    ouvintesDaHora.delete(ouvinte);
    if (ouvintesDaHora.size === 0) {
      desligarRelogio?.();
      desligarRelogio = null;
    }
  };
}

function resolver(theme: Theme, sistema: ResolvedTheme, hora: ResolvedTheme): ResolvedTheme {
  if (theme === "auto") return hora;
  if (theme === "system") return sistema;
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(inscreverEmTema, getTemaSnapshot, getTemaSnapshotDoServidor);
  const systemTheme = React.useSyncExternalStore(
    inscreverEmSistema,
    getSistemaSnapshot,
    getSistemaSnapshotDoServidor,
  );
  const hourTheme = React.useSyncExternalStore(inscreverNaHora, getHoraSnapshot, getHoraSnapshotDoServidor);

  const resolvedTheme = resolver(theme, systemTheme, hourTheme);

  // Efeito colateral (mutar `data-theme` no `<html>`) a partir de um valor
  // computado — por isso continua em `useEffect`, sem `setState`.
  React.useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    gravarTema(next);
  }, []);

  const toggle = React.useCallback(() => {
    const resolvidoAtual = resolver(getTemaSnapshot(), getSistemaSnapshot(), getHoraSnapshot());
    gravarTema(resolvidoAtual === "dark" ? "light" : "dark");
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggle }),
    [theme, resolvedTheme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}
