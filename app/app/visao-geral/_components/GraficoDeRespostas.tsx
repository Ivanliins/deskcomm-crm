"use client";

import { useT } from "@/hooks/i18n/useT";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { cn } from "@/lib/utils";
import type { BaldeDaSerie } from "@/lib/visao-geral/tipos";

import { formatarNumero, rotuloDoBalde, rotuloLongoDoBalde } from "./formatar";
import styles from "./visao-geral.module.css";

/** Alturas das barras-fantasma do estado vazio: a FORMA de um gráfico, sem número nenhum. */
const FANTASMA = [38, 56, 44, 70, 62, 82, 50, 66, 40, 58, 74, 48];

/**
 * Respostas enviadas aos clientes, balde a balde, empilhadas por quem escreveu:
 * IA embaixo (a base do atendimento), equipe em cima.
 *
 * Cada coluna é focável e tem um rótulo completo para leitor de tela — o
 * desenho sozinho não diz número nenhum, e a dica do mouse não existe para
 * quem navega pelo teclado.
 */
export function GraficoDeRespostas({
  baldes,
  granularidade,
  parcial,
  falhou,
  className,
}: {
  baldes: BaldeDaSerie[];
  granularidade: "hora" | "dia";
  parcial: boolean;
  falhou: boolean;
  className?: string;
}) {
  const t = useT();
  const idioma = useIdioma();

  const totais = baldes.map((b) => b.ia + b.equipe);
  const maximo = Math.max(0, ...totais);
  const totalIa = baldes.reduce((acc, b) => acc + b.ia, 0);
  const total = totais.reduce((acc, n) => acc + n, 0);
  const vazio = total === 0;
  const muitos = baldes.length > 14;
  const passo = granularidade === "hora" ? 3 : muitos ? 5 : 1;
  const fmt = (n: number) => formatarNumero(n, "inteiro", idioma);
  const pct = total > 0 ? formatarNumero(totalIa / total, "percentual", idioma) : null;

  return (
    <article
      data-vg-entra=""
      data-vg="painel"
      className={cn(
        styles.cartao,
        "flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-surface p-5",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-semibold">
            {granularidade === "hora" ? t("Respostas por hora") : t("Respostas por dia")}
          </h2>
          <p className="text-sm text-text-muted">
            {falhou
              ? t("Não foi possível carregar o gráfico agora.")
              : vazio
                ? t("Nenhuma resposta enviada aos clientes no período.")
                : `${fmt(total)} ${t("respostas no período")} · ${pct} ${t("pela IA")}`}
          </p>
        </div>
        <ul className="flex items-center gap-4 text-xs font-medium text-text-muted" aria-label={t("Legenda")}>
          <li className="flex items-center gap-1.5">
            <span className={cn(styles.amostraIa, "h-2.5 w-2.5 rounded-sm")} aria-hidden />
            {t("IA")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className={cn(styles.amostraEquipe, "h-2.5 w-2.5 rounded-sm")} aria-hidden />
            {t("Equipe")}
          </li>
        </ul>
      </header>

      <div>
        <div
          role="list"
          aria-label={granularidade === "hora" ? t("Respostas por hora") : t("Respostas por dia")}
          className={cn(
            styles.grafico,
            "relative flex h-56 items-end gap-0.5 border-b border-border sm:gap-1.5",
          )}
        >
          {baldes.map((b, i) => {
            const soma = b.ia + b.equipe;
            const altura = maximo > 0 ? (soma / maximo) * 100 : 0;
            const parteIa = soma > 0 ? (b.ia / soma) * 100 : 0;
            const longo = rotuloLongoDoBalde(b.chave, granularidade, t);
            return (
              <div
                key={b.chave}
                role="listitem"
                tabIndex={0}
                aria-label={`${longo}: ${fmt(b.ia)} ${t("da IA")}, ${fmt(b.equipe)} ${t("da equipe")}`}
                data-vg="coluna"
                className={cn(styles.coluna, "relative flex h-full min-w-0 flex-1 flex-col items-center justify-end")}
              >
                {!muitos && soma > 0 && (
                  <span className="mb-1 text-xs font-semibold text-text-muted tabular-nums" aria-hidden>
                    {fmt(soma)}
                  </span>
                )}
                {vazio ? (
                  <div
                    data-vg="barra"
                    className={cn(styles.pilha, styles.barraVazia, "w-full max-w-11 rounded-t-md")}
                    style={{ height: `${FANTASMA[i % FANTASMA.length]}%` }}
                    aria-hidden
                  />
                ) : (
                  <div
                    data-vg="barra"
                    className={cn(styles.pilha, "flex w-full max-w-11 flex-col overflow-hidden rounded-t-md")}
                    style={{ height: `${soma > 0 ? Math.max(altura, 2) : 0}%` }}
                    aria-hidden
                  >
                    <div className={styles.barraEquipe} style={{ height: `${100 - parteIa}%` }} />
                    <div className={styles.barraIa} style={{ height: `${parteIa}%` }} />
                  </div>
                )}
                <div
                  aria-hidden
                  className={cn(
                    styles.dica,
                    "absolute bottom-full left-1/2 z-10 mb-1 flex flex-col gap-0.5 whitespace-nowrap rounded-md bg-text px-2.5 py-1.5 text-xs text-bg shadow-md",
                  )}
                >
                  <span className="font-semibold">{longo}</span>
                  <span className="tabular-nums">
                    {t("IA")}: {fmt(b.ia)} · {t("Equipe")}: {fmt(b.equipe)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-0.5 sm:gap-1.5" aria-hidden>
          {baldes.map((b, i) => (
            <span key={b.chave} className="min-w-0 flex-1 truncate text-center text-xs text-text-subtle">
              {i % passo === 0 ? rotuloDoBalde(b.chave, granularidade, muitos, t) : ""}
            </span>
          ))}
        </div>
      </div>

      {parcial && (
        <p className="text-xs text-text-subtle">
          {t("Desenho parcial: o período tem mais mensagens do que o gráfico lê de uma vez. Os totais estão completos.")}
        </p>
      )}
    </article>
  );
}
