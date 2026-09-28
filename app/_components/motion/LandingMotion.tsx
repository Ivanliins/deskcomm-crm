"use client";

import { useEffect } from "react";

/**
 * Liga as animações GSAP da landing. O GSAP vem por `import()` dinâmico para
 * sair do bundle inicial: o HTML e o CSS pintam primeiro, a biblioteca chega
 * logo depois da hidratação.
 *
 * Se esse carregamento falhar, tira a classe `js-reveal` do `<html>` — é ela
 * que esconde o hero até a animação começar, e sem isto uma falha de rede
 * deixaria o topo da página invisível.
 */
export function LandingMotion() {
  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>("[data-landing]");
    if (!raiz) return;

    let desfazer: (() => void) | undefined;
    let desmontado = false;

    import("./manager")
      .then(({ iniciarAnimacoesDaLanding }) => {
        if (!desmontado) desfazer = iniciarAnimacoesDaLanding(raiz);
      })
      .catch(() => document.documentElement.classList.remove("js-reveal"));

    return () => {
      desmontado = true;
      desfazer?.();
    };
  }, []);

  return null;
}
