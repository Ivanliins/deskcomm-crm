import { EASE_FLUIDO, gsap } from "./gsap";

/**
 * Tagline (B11) presa à rolagem: cada palavra sai do tom apagado para a cor
 * plena em ordem de leitura, e volta ao rolar para cima. `scrub` segue a
 * posição da página em vez de disparar uma vez, e o ScrollTrigger já agrupa
 * as leituras de scroll por `requestAnimationFrame`.
 */
export function animarTagline(raiz: HTMLElement): void {
  const bloco = raiz.querySelector<HTMLElement>('[data-anim="tagline"]');
  if (!bloco) return;
  const palavras = bloco.querySelectorAll<HTMLElement>("[data-word]");

  // A transição CSS de `.word` atrasaria cada quadro do scrub.
  gsap.set(palavras, { transition: "none" });
  gsap.fromTo(
    palavras,
    { color: "rgba(0, 0, 0, 0.3)" },
    {
      color: "#000000",
      ease: EASE_FLUIDO,
      stagger: 0.12,
      scrollTrigger: { trigger: bloco, start: "top 80%", end: "bottom 45%", scrub: 0.5 },
    },
  );
}
