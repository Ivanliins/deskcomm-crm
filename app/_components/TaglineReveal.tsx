"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import styles from "../page.module.css";

/** As classes deste módulo existem de verdade — a leitura `string | undefined`
 * vem só do `noUncheckedIndexedAccess` do tsconfig tratando o CSS module como
 * index signature. `classList.toggle` exige `string`; o fallback nunca roda. */
const WORD_ACTIVE_CLASS = styles.wordActive ?? "";

interface TaglineRevealProps {
  lines: readonly string[];
}

/**
 * Seção obrigatória de tagline (B11): cada palavra ganha cor plena ao cruzar
 * uma linha de gatilho perto do meio da tela, em vez do bloco inteiro trocar
 * de cor de uma vez. `rootMargin` negativo na base encolhe a área "visível"
 * do observer para os ~58% de cima da viewport — é essa borda que funciona
 * como linha de gatilho, palavra por palavra, nos dois sentidos da rolagem.
 */
export function TaglineReveal({ lines }: TaglineRevealProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const words = container.querySelectorAll<HTMLElement>(`[data-word]`);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle(WORD_ACTIVE_CLASS, entry.isIntersecting);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -42% 0px" },
    );
    words.forEach((word) => observer.observe(word));
    return () => observer.disconnect();
  }, []);

  return (
    <p ref={containerRef} className="max-w-[680px] text-4xl font-bold leading-tight text-balance sm:text-5xl">
      {lines.map((line, lineIndex) => (
        <span key={line} className="block">
          {line.split(" ").map((word, wordIndex) => (
            <span key={`${lineIndex}-${wordIndex}-${word}`} data-word className={cn(styles.word, "mr-[0.28em] inline-block")}>
              {word}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}
