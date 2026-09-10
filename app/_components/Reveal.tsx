"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "../page.module.css";

interface RevealProps {
  children: ReactNode;
  /** Atraso do fade in, em ms — usado para escalonar itens de uma lista. */
  delay?: number;
  className?: string;
}

/**
 * Fade up com blur ao entrar na viewport (B7 do design system da landing).
 * IntersectionObserver, nunca `scroll` — evita reflow contínuo em mobile.
 * Dispara uma vez e desconecta: o objetivo é revelar conteúdo, não repetir a
 * animação toda vez que o usuário rola para cima e para baixo.
 */
export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(styles.reveal, visible && styles.revealVisible, className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
