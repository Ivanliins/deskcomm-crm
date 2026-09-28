import { gsap } from "./gsap";

/**
 * Barra de números: cada valor embaralha dígitos até assentar no valor real
 * quando entra na tela. O texto final já está no HTML (vale sem JS e para
 * buscador), a animação só reescreve por cima uma vez.
 */
export function animarNumeros(raiz: HTMLElement): void {
  raiz.querySelectorAll<HTMLElement>('[data-anim="numero"]').forEach((el) => {
    const final = el.textContent ?? "";
    gsap.to(el, {
      duration: 1.4,
      ease: "none",
      scrambleText: { text: final, chars: "0123456789", revealDelay: 0.4, speed: 0.6 },
      scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
    });
  });
}
