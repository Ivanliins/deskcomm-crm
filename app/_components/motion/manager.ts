import { gsap, registrarGsap, ScrollTrigger } from "./gsap";
import { animarHero } from "./hero";
import { animarJornada } from "./jornada";
import { animarNumeros } from "./numeros";
import { animarTagline } from "./tagline";

const COM_MOVIMENTO = "(prefers-reduced-motion: no-preference)";

/**
 * Ponto único de entrada das animações da landing. Tudo nasce dentro de um
 * `gsap.matchMedia()` com escopo na raiz: ele é um `gsap.context()` que
 * também reage a media queries, então `prefers-reduced-motion` e a troca
 * desktop/mobile desmontam e remontam só o que depende delas, e o retorno
 * desfaz tweens, ScrollTriggers, pins e splits de uma vez.
 *
 * Com movimento reduzido nada aqui roda: o CSS já deixa hero e tagline no
 * estado final (page.module.css).
 */
export function iniciarAnimacoesDaLanding(raiz: HTMLElement): () => void {
  registrarGsap();
  const mm = gsap.matchMedia(raiz);

  mm.add(COM_MOVIMENTO, () => {
    animarHero(raiz);
    animarTagline(raiz);
    animarNumeros(raiz);
  });
  mm.add(`${COM_MOVIMENTO} and (min-width: 1024px)`, () => animarJornada(raiz, { fixar: true }));
  mm.add(`${COM_MOVIMENTO} and (max-width: 1023px)`, () => animarJornada(raiz, { fixar: false }));

  // A troca de fonte e a troca de aba em "Recursos" mudam alturas acima da
  // Jornada fixada; sem recalcular, o pin começaria no lugar errado.
  let quadro = 0;
  const recalcular = () => {
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(() => ScrollTrigger.refresh());
  };
  void document.fonts?.ready.then(recalcular);
  const recursos = raiz.querySelector("#recursos");
  const observador = new ResizeObserver(recalcular);
  if (recursos) observador.observe(recursos);

  return () => {
    cancelAnimationFrame(quadro);
    observador.disconnect();
    mm.revert();
  };
}
