import { cn } from "@/lib/utils";
import styles from "../page.module.css";

interface TaglineRevealProps {
  lines: readonly string[];
}

/**
 * Seção obrigatória de tagline (B11). Só a marcação: cada palavra nasce
 * apagada (CSS, quando `html.js-reveal` existe) e quem a acende, em ordem de
 * leitura e preso à rolagem, é `motion/tagline.ts`.
 */
export function TaglineReveal({ lines }: TaglineRevealProps) {
  return (
    <p data-anim="tagline" className="max-w-[680px] text-4xl font-bold leading-tight text-balance sm:text-5xl">
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
