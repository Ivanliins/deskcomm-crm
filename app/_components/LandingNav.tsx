"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import styles from "../page.module.css";

const LINKS = [
  { href: "#jornada", label: "Como funciona" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
] as const;

/**
 * Nav ilha flutuante (B7): pílula destacada do topo, sticky, com hambúrguer
 * que vira X (nunca some) e um menu cheio de tela no mobile.
 *
 * O CTA principal fica visível no header em QUALQUER largura — sem depender
 * do hambúrguer abrir — porque sem JavaScript o botão continua funcionando
 * (é um <Link>), enquanto o menu cheio de tela depende de estado React.
 */
export function LandingNav({ name }: { name: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex justify-center px-4 pt-4 sm:pt-6">
        <div className="flex w-full max-w-3xl items-center gap-2 sm:gap-3">
          {/* Pílula circular com a inicial do nome — a mesma ideia do ícone
              da aba (`app/icon.tsx`): cor de destaque + inicial, nunca uma
              imagem fixa, porque o produto é white-label e qualquer nome
              futuro precisa continuar cabendo aqui sem redesenho. */}
          <Link
            href="/"
            aria-label={name}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:h-11 sm:w-11 ${styles.floatShadow}`}
          >
            {name.charAt(0).toUpperCase()}
          </Link>
          <div
            className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-full border border-border bg-accent-100/70 py-2 pl-4 pr-2 backdrop-blur-xl sm:gap-6 sm:pl-5 ${styles.floatShadow}`}
          >
            <span className="hidden max-w-[16vw] truncate text-sm font-bold tracking-tight sm:inline">{name}</span>
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-sm transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="#precos">
                  <span className="hidden sm:inline">Começar teste grátis</span>
                  <span className="sm:hidden">Testar grátis</span>
                </Link>
              </Button>
              <button
                type="button"
                aria-expanded={open}
                aria-controls="menu-mobile"
                aria-label={open ? "Fechar menu" : "Abrir menu"}
                onClick={() => setOpen((v) => !v)}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:hidden"
              >
                <span className="relative block h-3.5 w-4">
                  <span
                    className={`absolute left-0 top-0 h-[1.5px] w-4 bg-text transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      open ? "translate-y-[6.5px] rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`absolute bottom-0 left-0 h-[1.5px] w-4 bg-text transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      open ? "-translate-y-[6.5px] -rotate-45" : ""
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        id="menu-mobile"
        className={`fixed inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-bg/95 backdrop-blur-2xl transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        // `inert` (suportado como prop nativa desde React 19) tira os links do
        // overlay da ordem de Tab enquanto ele está fechado — sem isto, Tab
        // levaria o foco a um menu invisível.
        inert={!open}
      >
        {LINKS.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={`rounded-sm text-2xl font-semibold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
              open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
            style={{ transitionDelay: open ? `${100 + i * 60}ms` : "0ms" }}
          >
            {link.label}
          </a>
        ))}
        <Link
          href="/login"
          onClick={() => setOpen(false)}
          className={`rounded-sm text-2xl font-semibold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
            open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
          }`}
          style={{ transitionDelay: open ? `${100 + LINKS.length * 60}ms` : "0ms" }}
        >
          Entrar
        </Link>
      </div>
    </>
  );
}
