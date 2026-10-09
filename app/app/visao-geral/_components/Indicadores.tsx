"use client";

import Link from "next/link";
import type { ComponentType } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import {
  ArrowRight,
  ChatsCircle,
  CurrencyCircleDollar,
  Hourglass,
  Info,
  Robot,
  TrendDown,
  TrendUp,
  UserPlus,
} from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import type { Periodo } from "@/lib/visao-geral/periodo";
import type { IdDoIndicador, Indicador } from "@/lib/visao-geral/tipos";

import { formatarNumero, formatarVariacao, sentidoDaVariacao } from "./formatar";
import styles from "./visao-geral.module.css";

type Icone = ComponentType<{
  size?: number;
  weight?: "regular" | "bold" | "fill";
  className?: string;
  "aria-hidden"?: boolean;
}>;

const META: Record<IdDoIndicador, { rotulo: string; ajuda: string; icone: Icone }> = {
  atendimentos: {
    rotulo: "Atendimentos",
    ajuda:
      "Pedidos de clientes que começaram no período: cada cliente que escreveu sem ter um atendimento aberto conta uma vez.",
    icone: ChatsCircle,
  },
  respostas_ia: {
    rotulo: "IA respondeu",
    ajuda:
      "Das mensagens enviadas aos clientes no período, a parte que a IA escreveu. O resto saiu da equipe, pelo sistema ou pelo celular da loja.",
    icone: Robot,
  },
  vendas: {
    rotulo: "Vendas",
    ajuda: "A soma dos negócios marcados como ganhos no período, em todos os funis.",
    icone: CurrencyCircleDollar,
  },
  leads: {
    rotulo: "Leads novos",
    ajuda: "Negócios criados no período, em qualquer funil — pela IA, pela equipe ou por integração.",
    icone: UserPlus,
  },
  aguardando: {
    rotulo: "Esperando você",
    ajuda:
      "Conversas em que o automático saiu e ninguém assumiu ainda. É a mesma conta da Fila do Inbox, agora.",
    icone: Hourglass,
  },
};

/** Curto, para caber debaixo do número; o longo vai na dica da pílula. */
const COMPARACAO: Record<Periodo, { curto: string; longo: string }> = {
  hoje: { curto: "vs. ontem", longo: "Comparado com ontem, da meia-noite até esta mesma hora" },
  "7d": {
    curto: "vs. 7 dias antes",
    longo: "Comparado com os 7 dias anteriores, até esta mesma hora",
  },
  "30d": {
    curto: "vs. 30 dias antes",
    longo: "Comparado com os 30 dias anteriores, até esta mesma hora",
  },
};

export function Indicadores({
  indicadores,
  periodo,
  realcados,
}: {
  indicadores: Indicador[];
  periodo: Periodo;
  /** Ids cujo número mudou na última atualização — ganham um brilho breve. */
  realcados: ReadonlySet<string>;
}) {
  const t = useT();
  const idioma = useIdioma();

  return (
    // Colunas pela largura da ÁREA da tela (container query), não da janela: com
    // o menu lateral aberto, 1280px de janela são ~950px de conteúdo. No meio do
    // caminho a grade tem SEIS colunas para fechar duas linhas cheias — três
    // cartões de duas colunas em cima, dois de três embaixo —, em vez de cinco
    // cartões em três colunas com um buraco no fim.
    <section
      aria-label={t("Indicadores do período")}
      className="grid grid-cols-2 gap-3 @3xl:grid-cols-6 @5xl:grid-cols-5"
    >
      {indicadores.map((ind, i) => {
        const meta = META[ind.id];
        const Icone = meta.icone;
        const texto =
          ind.valor == null ? "—" : formatarNumero(ind.valor, ind.formato, idioma, ind.moeda);
        const sentido = sentidoDaVariacao(ind.variacao, ind.subirEhBom);
        const fila = ind.id === "aguardando";
        return (
          <article
            key={ind.id}
            data-vg-entra=""
            data-vg="kpi"
            data-vg-id={ind.id}
            className={cn(
              styles.cartao,
              realcados.has(ind.id) && styles.realce,
              "flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4 @5xl:col-span-1",
              i < 3 ? "@3xl:col-span-2" : "@3xl:col-span-3",
              fila && "col-span-2",
              fila && (ind.valor ?? 0) > 0 && "border-warning",
            )}
          >
            <header className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
              {/* No celular o cartão tem ~170px: o ícone cede o espaço ao rótulo. */}
              <Icone size={16} className="hidden shrink-0 sm:block" aria-hidden />
              <span className="truncate">{t(meta.rotulo)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-subtle hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    aria-label={`${t("O que é")}: ${t(meta.rotulo)}`}
                  >
                    <Info size={14} aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-pretty leading-relaxed">
                  {t(meta.ajuda)}
                </TooltipContent>
              </Tooltip>
            </header>

            <p className="text-3xl font-extrabold leading-none tracking-tight tabular-nums">
              <span
                data-vg-numero={ind.id}
                data-valor={ind.valor ?? ""}
                data-formato={ind.formato}
                data-moeda={ind.moeda ?? ""}
              >
                {texto}
              </span>
            </p>

            <footer className="mt-auto flex flex-col gap-1.5">
              <div className="flex min-h-8 items-end justify-between gap-2">
                {fila ? (
                  <Link
                    href="/app/inbox?filter=unassigned"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-text hover:underline"
                  >
                    {(ind.valor ?? 0) > 0 ? t("Abrir a Fila") : t("Ninguém na Fila")}
                    <ArrowRight size={12} aria-hidden />
                  </Link>
                ) : ind.variacao ? (
                  <span
                    title={t(COMPARACAO[periodo].longo)}
                    className={cn(
                      "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                      sentido === "bom" && "bg-success-bg text-success-fg",
                      sentido === "ruim" && "bg-error-bg text-error-fg",
                      sentido === "neutro" && "bg-surface-elevated text-text-muted",
                    )}
                  >
                    {ind.variacao.tipo !== "novo" &&
                      (ind.variacao.valor >= 0 ? (
                        <TrendUp size={12} weight="bold" aria-hidden />
                      ) : (
                        <TrendDown size={12} weight="bold" aria-hidden />
                      ))}
                    {formatarVariacao(ind.variacao, idioma, t)}
                  </span>
                ) : (
                  <span className="text-xs text-text-subtle">
                    {ind.valor == null ? t("Sem dados no período") : t("Sem comparação ainda")}
                  </span>
                )}
                {/* Série toda em zero não desenha nada: um traço no chão parece sublinhado. */}
                {ind.serie && ind.serie.some((v) => v > 0) && <Sparkline serie={ind.serie} />}
              </div>
              {ind.variacao && !fila && (
                <p className="truncate text-xs text-text-subtle">{t(COMPARACAO[periodo].curto)}</p>
              )}
              {ind.id === "vendas" && ind.apoio != null && (
                <p className="truncate text-xs font-medium text-text-muted tabular-nums">
                  {ind.apoio} {ind.apoio === 1 ? t("negócio ganho") : t("negócios ganhos")}
                </p>
              )}
            </footer>
          </article>
        );
      })}
    </section>
  );
}

/** A forma do período em 96×32 (encolhe com o cartão). */
function Sparkline({ serie }: { serie: number[] }) {
  if (serie.length < 2) return null;
  const L = 96;
  const A = 32;
  const M = 3;
  const max = Math.max(...serie);
  const min = Math.min(0, ...serie);
  const faixa = max - min;
  const pontos = serie.map((v, i) => {
    const x = M + (i * (L - 2 * M)) / (serie.length - 1);
    const y = faixa === 0 ? A - M : A - M - ((v - min) / faixa) * (A - 2 * M);
    return [x, y] as const;
  });
  const linha = pontos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const primeiro = pontos[0]!;
  const ultimo = pontos[pontos.length - 1]!;
  const area = `M${primeiro[0].toFixed(1)},${A} L${pontos
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" L")} L${ultimo[0].toFixed(1)},${A} Z`;
  return (
    // Encolhe com o cartão (até sumir de fininho) em vez de vazar pela borda: no
    // celular dois cartões dividem 390px, e 96px fixos não cabem ao lado da pílula.
    <svg
      viewBox={`0 0 ${L} ${A}`}
      aria-hidden
      className={cn(styles.spark, "h-8 w-full min-w-0 max-w-24")}
    >
      <path d={area} className={styles.sparkArea} data-vg="spark-area" />
      <polyline
        points={linha}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.sparkLinha}
        data-vg="spark"
      />
      <circle cx={ultimo[0]} cy={ultimo[1]} r={2.5} className={styles.sparkPonto} data-vg="spark-ponto" />
    </svg>
  );
}
