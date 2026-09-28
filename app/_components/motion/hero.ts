import { EASE_FLUIDO, gsap, SplitText } from "./gsap";

/**
 * Entrada do hero: selo, título palavra por palavra (rotação 3D curta), e o
 * resto em cascata. Os alvos nascem com `visibility: hidden` pelo CSS (ver
 * page.module.css) para não piscar visíveis antes do GSAP carregar.
 *
 * O split é desfeito no fim: o título usa gradiente com `background-clip:
 * text`, e deixar as palavras quebradas em blocos transformados para sempre
 * arrisca o gradiente sumir em alguns navegadores.
 */
export function animarHero(raiz: HTMLElement): void {
  const titulo = raiz.querySelector<HTMLElement>('[data-anim="hero-titulo"]');
  const [selo, ...resto] = Array.from(raiz.querySelectorAll<HTMLElement>('[data-anim="hero"]'));
  if (!titulo || !selo) return;

  const split = SplitText.create(titulo, { type: "words" });
  // Perspectiva fixa, fora do tween: dentro de um `.from()` ela seria animada
  // junto e distorceria as palavras no caminho.
  gsap.set(split.words, { transformPerspective: 800, transformOrigin: "50% 100%" });

  gsap
    .timeline({ defaults: { ease: EASE_FLUIDO }, onComplete: () => split.revert() })
    .fromTo(selo, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9 })
    .set(titulo, { autoAlpha: 1 }, "<0.15")
    .from(split.words, { autoAlpha: 0, yPercent: 60, rotateX: -70, duration: 1.1, stagger: 0.06 }, "<")
    .fromTo(resto, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, "-=0.7");
}
