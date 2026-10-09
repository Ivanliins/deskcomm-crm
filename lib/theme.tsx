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

const STORAGE_KEY = "deskcomm-theme";

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

function getHourTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return temaDaHora();
}

function resolve(theme: Theme, system: ResolvedTheme, hour: ResolvedTheme): ResolvedTheme {
  if (theme === "auto") return hour;
  if (theme === "system") return system;
  return theme;
}

/**
 * Aplica no `<html>`. A troca é um cross-fade quando o navegador tem View
 * Transitions e a pessoa não pediu menos movimento — é o que faz a virada das
 * 18h acontecer sem um "piscar" no meio do trabalho.
 *
 * Só troca quando o valor MUDA: no primeiro efeito depois da hidratação o script
 * anti-flash do layout já deixou o atributo certo, e uma transição ali seria um
 * fade de uma tela para ela mesma.
 *
 * Com a aba OCULTA não há transição: o navegador a aborta (InvalidStateError) e
 * as promessas dela rejeitam sem ninguém ouvir — medido na vitrine, quatro erros
 * "Uncaught (in promise)" por troca. A virada das 18h numa aba esquecida em
 * segundo plano é justamente esse caso. As promessas ainda são "ouvidas" porque
 * o navegador também aborta por outros motivos (outra transição começando).
 */
function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === resolved) return;
  const swap = () => root.setAttribute("data-theme", resolved);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lê do storage no primeiro render do client (não causa hydration mismatch
  // porque o inline script no layout já setou o data-theme antes do paint).
  const [theme, setThemeState] = React.useState<Theme>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
    getSystemTheme(),
  );
  const [hourTheme, setHourTheme] = React.useState<ResolvedTheme>(() => getHourTheme());

  // Listener pra mudanças do prefers-color-scheme.
  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Relógio do modo `auto`: um temporizador até a próxima virada (6h/18h), e
  // uma reconferida quando a aba volta a ficar visível — notebook que dormiu às
  // 17h e acordou às 19h não dispara o temporizador na hora certa, mas dispara
  // `visibilitychange`.
  React.useEffect(() => {
    if (theme !== "auto") return;
    let timer: number | undefined;
    const check = () => {
      setHourTheme(temaDaHora());
      window.clearTimeout(timer);
      timer = window.setTimeout(check, msAteAProximaVirada());
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [theme]);

  const resolvedTheme = resolve(theme, systemTheme, hourTheme);

  // Aplica no DOM sempre que o tema efetivo muda.
  React.useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistência opcional — falha silenciosamente.
    }
  }, []);

  const toggle = React.useCallback(() => {
    setThemeState((current) => {
      const currentResolved = resolve(current, getSystemTheme(), getHourTheme());
      const next: Theme = currentResolved === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
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
