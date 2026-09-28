import { EASE_FLUIDO, gsap } from "./gsap";

interface OpcoesJornada {
  /** Só no desktop: no mobile a seção empilha e travar a tela atrapalha. */
  readonly fixar: boolean;
}

/**
 * "A vida de uma conversa": a seção trava enquanto a linha se desenha de uma
 * etapa à outra, e cada etapa acende quando a linha chega nela. É o único
 * movimento de rolagem longa da página, e ele conta a sequência real do
 * produto, não decora.
 */
export function animarJornada(raiz: HTMLElement, { fixar }: OpcoesJornada): void {
  const secao = raiz.querySelector<HTMLElement>('[data-anim="jornada"]');
  if (!secao) return;
  const linha = secao.querySelector<SVGPathElement>('[data-anim="jornada-linha"]');
  const etapas = secao.querySelectorAll<HTMLElement>('[data-anim="jornada-etapa"]');

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: fixar
      ? { trigger: secao, start: "center center", end: "+=110%", pin: true, scrub: 0.6 }
      : { trigger: secao, start: "top 75%", end: "bottom 60%", scrub: 0.6 },
  });

  if (linha && fixar) {
    tl.fromTo(linha, { drawSVG: "0%" }, { drawSVG: "100%", duration: etapas.length }, 0);
  }
  etapas.forEach((etapa, i) => {
    tl.fromTo(etapa, { opacity: 0.3 }, { opacity: 1, duration: 0.6, ease: EASE_FLUIDO }, i);
  });
}
