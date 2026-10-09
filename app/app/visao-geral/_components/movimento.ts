/**
 * O MOVIMENTO DA VISÃO GERAL — curto, uma vez, e só quando ajuda a ler.
 *
 * Duas coreografias, as duas presas a `gsap.matchMedia` com
 * `prefers-reduced-motion: no-preference` — quem pediu menos movimento recebe a
 * tela pronta, sem nada se mexendo:
 *
 *  - **Entrada** (`animarEntrada`): a tela se monta de cima para baixo em
 *    ~1,6s — cabeçalho, números contando até o valor, linhas dos mini-gráficos
 *    se desenhando, barras crescendo do chão, funil enchendo da esquerda.
 *    Acontece UMA vez por visita, não a cada atualização.
 *
 *  - **Atualização** (`animarAtualizacao`): a cada leitura nova, só o que
 *    MUDOU se mexe — um número conta do valor antigo ao novo, uma barra cresce
 *    da altura antiga à nova, uma conversa que acabou de entrar desliza para a
 *    lista. Uma tela que se re-anima inteira a cada minuto vira ruído, e ruído
 *    é como um painel deixa de ser olhado.
 *
 * O texto de cada número está no HTML desde o servidor (vale sem JS, para
 * leitor de tela e para quem copia). A contagem escreve no MESMO nó de texto que
 * o React criou (`nodeValue`), nunca troca o nó — senão o próximo render do
 * React atualizaria um nó que já saiu do DOM. E o texto final de toda contagem
 * sai de `formatarNumero` com o valor-alvo, a mesma função que o React usa:
 * contagem interrompida no meio sempre termina no número certo.
 */
import { EASE_FLUIDO, gsap, registrarGsap } from "@/app/_components/motion/gsap";
import type { Idioma } from "@/lib/i18n/idiomas";
import type { FormatoDoNumero, VisaoGeralDados } from "@/lib/visao-geral/tipos";

import { formatarNumero } from "./formatar";

const COM_MOVIMENTO = "(prefers-reduced-motion: no-preference)";

/** Contagens em andamento → como deixá-las no número final se forem interrompidas. */
type Pendentes = Map<HTMLElement, () => void>;

/**
 * Um ciclo de animação (uma entrada, ou uma atualização). Desfazê-lo liga
 * `cancelado` ANTES do `revert()` do GSAP: o `revert` re-renderiza cada tween no
 * ponto de partida, e uma contagem re-renderizada no início escreveria o valor
 * de PARTIDA (zero, na entrada) num número que já estava certo — medido na
 * vitrine: "Esperando você" voltava a 0 depois de trocar o período.
 */
interface Ciclo {
  pendentes: Pendentes;
  cancelado: boolean;
}

function escrever(el: HTMLElement, texto: string): void {
  const no = el.firstChild;
  if (no && no.nodeType === Node.TEXT_NODE) no.nodeValue = texto;
}

function texto(el: HTMLElement, valor: number, idioma: Idioma): string {
  const formato = (el.dataset.formato || "inteiro") as FormatoDoNumero;
  // Intermediário apresentável: inteiro conta de 1 em 1, moeda de real em real.
  const v =
    formato === "inteiro" ? Math.round(valor) : formato === "moeda" ? Math.round(valor / 100) * 100 : valor;
  return formatarNumero(v, formato, idioma, el.dataset.moeda || "BRL");
}

/** O texto exato que o React escreveria para `valor` — o destino de toda contagem. */
function textoFinal(el: HTMLElement, valor: number, idioma: Idioma): string {
  return formatarNumero(valor, (el.dataset.formato || "inteiro") as FormatoDoNumero, idioma, el.dataset.moeda || "BRL");
}

function contar(
  el: HTMLElement,
  de: number,
  para: number,
  idioma: Idioma,
  duracao: number,
  ciclo: Ciclo,
): void {
  if (ciclo.cancelado) return;
  const finalizar = () => {
    escrever(el, textoFinal(el, para, idioma));
    ciclo.pendentes.delete(el);
  };
  ciclo.pendentes.get(el)?.();
  ciclo.pendentes.set(el, finalizar);
  const estado = { v: de };
  escrever(el, texto(el, de, idioma));
  gsap.to(estado, {
    v: para,
    duration: duracao,
    ease: "power3.out",
    onUpdate: () => {
      if (!ciclo.cancelado) escrever(el, texto(el, estado.v, idioma));
    },
    onComplete: () => {
      if (!ciclo.cancelado) finalizar();
    },
  });
}

function desfazer(mm: gsap.MatchMedia, ciclo: Ciclo): () => void {
  return () => {
    ciclo.cancelado = true;
    mm.revert();
    for (const finalizar of [...ciclo.pendentes.values()]) finalizar();
  };
}

export function animarEntrada(raiz: HTMLElement, idioma: Idioma): () => void {
  registrarGsap();
  const mm = gsap.matchMedia(raiz);
  const ciclo: Ciclo = { pendentes: new Map(), cancelado: false };

  mm.add(COM_MOVIMENTO, () => {
    const q = gsap.utils.selector(raiz);
    const fim = { clearProps: "opacity,visibility,transform" };
    const tl = gsap.timeline({ defaults: { ease: EASE_FLUIDO } });

    tl.fromTo(
      q("[data-vg='cabecalho'] > *"),
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, ...fim },
      0,
    );

    tl.fromTo(
      q("[data-vg='kpi']"),
      { autoAlpha: 0, y: 22, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.07, ...fim },
      0.12,
    );

    q<HTMLElement>("[data-vg-numero]").forEach((el, i) => {
      const valor = Number(el.dataset.valor);
      if (!el.dataset.valor || !Number.isFinite(valor) || valor === 0) return;
      // Até a vez dele chegar o número já fica no zero — não aparece cheio para
      // depois zerar, que seria o oposto de "contar". Se a entrada for desfeita
      // antes disso, o finalizador devolve o número de verdade.
      escrever(el, texto(el, 0, idioma));
      ciclo.pendentes.set(el, () => {
        escrever(el, textoFinal(el, valor, idioma));
        ciclo.pendentes.delete(el);
      });
      tl.add(() => contar(el, 0, valor, idioma, 1.5, ciclo), 0.3 + i * 0.07);
    });

    tl.fromTo(
      q("[data-vg='spark']"),
      { drawSVG: "0%" },
      {
        drawSVG: "100%",
        duration: 1.3,
        ease: "power2.inOut",
        stagger: 0.07,
        clearProps: "strokeDasharray,strokeDashoffset",
      },
      0.35,
    );
    tl.fromTo(
      q("[data-vg='spark-area']"),
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.9, stagger: 0.07, clearProps: "opacity,visibility" },
      0.75,
    );
    tl.fromTo(
      q("[data-vg='spark-ponto']"),
      { scale: 0, transformOrigin: "50% 50%" },
      { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.07, clearProps: "transform" },
      1.35,
    );

    tl.fromTo(
      q("[data-vg='painel']"),
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 1, stagger: 0.09, ...fim },
      0.3,
    );

    tl.fromTo(
      q("[data-vg='barra']"),
      { scaleY: 0, transformOrigin: "50% 100%" },
      { scaleY: 1, duration: 0.85, ease: "power3.out", stagger: 0.03, clearProps: "transform" },
      0.55,
    );

    tl.fromTo(
      q("[data-vg='funil-barra']"),
      { scaleX: 0, transformOrigin: "0% 50%" },
      { scaleX: 1, duration: 1.1, stagger: 0.1, clearProps: "transform" },
      0.7,
    );

    tl.fromTo(
      q("[data-vg='item']"),
      { autoAlpha: 0, x: -10 },
      { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.05, ...fim },
      0.75,
    );

    tl.fromTo(
      q("[data-vg='linha']"),
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.035, ...fim },
      0.9,
    );
  });

  return desfazer(mm, ciclo);
}

function maiorTotal(d: VisaoGeralDados): number {
  return Math.max(0, ...d.serie.baldes.map((b) => b.ia + b.equipe));
}

/**
 * Anima só a diferença entre duas leituras. Roda num `useLayoutEffect`, ANTES
 * do navegador pintar o render novo — é o que permite um número voltar ao valor
 * antigo e contar até o novo sem que o novo apareça por um quadro antes.
 */
export function animarAtualizacao(
  raiz: HTMLElement,
  antes: VisaoGeralDados,
  depois: VisaoGeralDados,
  idioma: Idioma,
): () => void {
  registrarGsap();
  const mm = gsap.matchMedia(raiz);
  const ciclo: Ciclo = { pendentes: new Map(), cancelado: false };

  // Antes de qualquer contagem, todo número volta a dizer o valor da leitura
  // nova. O ciclo anterior pode ter sido desfeito no meio do caminho, e o React
  // só reescreve um texto quando o valor MUDA — um número que não mudou e ficou
  // no intermediário não seria corrigido por ninguém.
  for (const ind of depois.indicadores) {
    const el = raiz.querySelector<HTMLElement>(`[data-vg-numero="${ind.id}"]`);
    if (el && ind.valor != null) escrever(el, textoFinal(el, ind.valor, idioma));
  }

  mm.add(COM_MOVIMENTO, () => {
    const q = gsap.utils.selector(raiz);

    for (const ind of depois.indicadores) {
      const velho = antes.indicadores.find((x) => x.id === ind.id);
      if (!velho || velho.valor == null || ind.valor == null || velho.valor === ind.valor) continue;
      const el = raiz.querySelector<HTMLElement>(`[data-vg-numero="${ind.id}"]`);
      if (el) contar(el, velho.valor, ind.valor, idioma, 1.1, ciclo);
    }

    const trocouDePeriodo =
      antes.periodo !== depois.periodo || antes.serie.baldes.length !== depois.serie.baldes.length;

    if (trocouDePeriodo) {
      // Outro período é outro gráfico: ele se redesenha do chão, rápido.
      gsap.fromTo(
        q("[data-vg='barra']"),
        { scaleY: 0, transformOrigin: "50% 100%" },
        { scaleY: 1, duration: 0.7, ease: "power3.out", stagger: 0.02, overwrite: true, clearProps: "transform" },
      );
      gsap.fromTo(
        q("[data-vg='spark']"),
        { drawSVG: "0%" },
        {
          drawSVG: "100%",
          duration: 0.9,
          ease: "power2.inOut",
          stagger: 0.05,
          overwrite: true,
          clearProps: "strokeDasharray,strokeDashoffset",
        },
      );
      gsap.fromTo(
        q("[data-vg='funil-barra']"),
        { scaleX: 0, transformOrigin: "0% 50%" },
        { scaleX: 1, duration: 0.8, ease: EASE_FLUIDO, stagger: 0.06, overwrite: true, clearProps: "transform" },
      );
    } else {
      // Mesmo período: cada barra parte da altura que TINHA. A escala é relativa
      // ao maior balde de cada leitura, então a conta usa os dois máximos.
      const barras = q<HTMLElement>("[data-vg='barra']");
      const maxAntes = maiorTotal(antes);
      const maxDepois = maiorTotal(depois);
      depois.serie.baldes.forEach((b, i) => {
        const velho = antes.serie.baldes[i];
        const barra = barras[i];
        if (!velho || !barra) return;
        const alturaNova = maxDepois > 0 ? (b.ia + b.equipe) / maxDepois : 0;
        const alturaVelha = maxAntes > 0 ? (velho.ia + velho.equipe) / maxAntes : 0;
        if (alturaNova <= 0 || Math.abs(alturaNova - alturaVelha) < 0.005) return;
        gsap.fromTo(
          barra,
          { scaleY: Math.min(alturaVelha / alturaNova, 4), transformOrigin: "50% 100%" },
          { scaleY: 1, duration: 0.9, ease: EASE_FLUIDO, overwrite: true, clearProps: "transform" },
        );
      });
    }

    // Conversa que não estava na leitura anterior entra deslizando.
    const conhecidos = new Set([
      ...antes.ia.itens.map((c) => c.id),
      ...antes.fila.itens.map((c) => c.id),
      ...antes.recentes.map((c) => c.id),
    ]);
    const novos = q<HTMLElement>("[data-vg-item-id]").filter(
      (el) => !conhecidos.has(el.dataset.vgItemId ?? ""),
    );
    if (novos.length > 0) {
      gsap.fromTo(
        novos,
        { autoAlpha: 0, x: -14 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.7,
          ease: EASE_FLUIDO,
          stagger: 0.06,
          overwrite: true,
          clearProps: "opacity,visibility,transform",
        },
      );
    }
  });

  return desfazer(mm, ciclo);
}
