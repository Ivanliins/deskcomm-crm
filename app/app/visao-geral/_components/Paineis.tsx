"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { useT } from "@/hooks/i18n/useT";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { ArrowRight, CheckCircle, Funnel, Robot } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import type { VisaoGeralDados } from "@/lib/visao-geral/tipos";

import { formatarNumero, tempoRelativo } from "./formatar";
import styles from "./visao-geral.module.css";

const CARTAO = "flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-5";

function Falhou() {
  const t = useT();
  return (
    <p className="rounded-lg bg-surface-elevated px-3 py-2.5 text-sm text-text-muted">
      {t("Não foi possível carregar agora. Os números voltam na próxima atualização.")}
    </p>
  );
}

// ─── IA ao vivo ──────────────────────────────────────────────────────────────

export function IaAoVivo({
  ia,
  referencia,
  podeConfigurarIa,
  falhou,
}: {
  ia: VisaoGeralDados["ia"];
  referencia: string;
  podeConfigurarIa: boolean;
  falhou: boolean;
}) {
  const t = useT();
  const idioma = useIdioma();
  const semAgente = ia.noAr === false;

  return (
    <article
      data-vg-entra=""
      data-vg="painel"
      className={cn(styles.cartao, styles.tinta, "flex min-w-0 flex-col gap-4 rounded-2xl p-5")}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-semibold">{t("IA ao vivo")}</h2>
          <p className={cn(styles.tintaSuave, "text-xs")}>
            {t("Conversas com o automático no comando nas últimas 24 horas")}
          </p>
        </div>
        {!semAgente && (
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground tabular-nums">
            <span className={cn(styles.vivo, styles.vivoNaTinta)} aria-hidden />
            {formatarNumero(ia.total, "inteiro", idioma)}{" "}
            {ia.total === 1 ? t("conversa") : t("conversas")}
          </span>
        )}
      </header>

      {falhou ? (
        <p className={cn(styles.tintaSuave, "text-sm")}>
          {t("Não foi possível carregar agora. Os números voltam na próxima atualização.")}
        </p>
      ) : semAgente ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 py-4">
          <Robot size={28} aria-hidden />
          <p className="text-sm font-semibold">{t("Nenhum agente de IA no ar")}</p>
          <p className={cn(styles.tintaSuave, "text-sm")}>
            {t("Quando um agente estiver publicado, as conversas que ele atende aparecem aqui, ao vivo.")}
          </p>
          {podeConfigurarIa && (
            <Link
              href="/app/ai/agents"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground"
            >
              {t("Configurar agente")}
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      ) : ia.itens.length === 0 ? (
        <p className={cn(styles.tintaSuave, "flex flex-1 items-center py-4 text-sm")}>
          {t("Nenhuma conversa com a IA nas últimas 24 horas.")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {ia.itens.map((c) => (
            <li key={c.id} data-vg="item" data-vg-item-id={c.id} className={cn(styles.tintaLinha, "border-t first:border-t-0")}>
              <Link
                href={`/app/inbox/${c.id}`}
                className={cn(styles.tintaHover, "-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 focus-visible:outline-2 focus-visible:outline-ring")}
              >
                <span
                  className={cn(
                    styles.tintaAvatar,
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                  )}
                  aria-hidden
                >
                  {c.contato.iniciais}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{c.contato.nome}</span>
                  <span className={cn(styles.tintaSuave, "truncate text-xs")}>{c.previa ?? "—"}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold",
                      c.ultimo === "ia"
                        ? "bg-accent text-accent-foreground"
                        : cn(styles.tintaLinha, "border"),
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        c.ultimo === "ia" ? "bg-accent-foreground" : "bg-warning",
                      )}
                      aria-hidden
                    />
                    {c.ultimo === "ia" ? t("IA respondeu") : t("Cliente escreveu")}
                  </span>
                  <span className={cn(styles.tintaSuave, "text-xs")}>
                    {tempoRelativo(c.quando, referencia, idioma, t)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/app/inbox?filter=ai"
        className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-semibold hover:underline"
      >
        {t("Ver no Inbox")}
        <ArrowRight size={14} aria-hidden />
      </Link>
    </article>
  );
}

// ─── Funil ───────────────────────────────────────────────────────────────────

export function Funil({ funil, falhou }: { funil: VisaoGeralDados["funil"]; falhou: boolean }) {
  const t = useT();
  const idioma = useIdioma();
  const etapas = funil?.etapas ?? [];
  const maior = Math.max(1, ...etapas.map((e) => e.quantidade));
  const abertos = etapas.filter((e) => !e.ganha).reduce((acc, e) => acc + e.quantidade, 0);
  const ganhos = etapas.filter((e) => e.ganha).reduce((acc, e) => acc + e.quantidade, 0);
  const abertas = etapas.filter((e) => !e.ganha).length;

  return (
    <article data-vg-entra="" data-vg="painel" className={cn(styles.cartao, CARTAO)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-semibold">{t("Funil de vendas")}</h2>
          {funil && <p className="truncate text-sm text-text-muted">{funil.nome}</p>}
        </div>
        {funil && etapas.length > 0 && (
          <p className="text-sm text-text-muted tabular-nums">
            <b className="font-semibold text-text">{formatarNumero(abertos, "inteiro", idioma)}</b>{" "}
            {t("em aberto")} · <b className="font-semibold text-text">{formatarNumero(ganhos, "inteiro", idioma)}</b>{" "}
            {t("ganhos no período")}
          </p>
        )}
      </header>

      {falhou ? (
        <Falhou />
      ) : !funil || etapas.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 py-4">
          <Funnel size={26} className="text-text-subtle" aria-hidden />
          <p className="text-sm text-text-muted">
            {funil ? t("Este funil ainda não tem etapas.") : t("Nenhum funil criado ainda.")}
          </p>
          <Link
            href="/app/kanban"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-text hover:underline"
          >
            {t("Abrir Funis")}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {etapas.map((e, i) => {
            // A tinta clareia etapa a etapa: o funil "esvazia" até a venda, que é verde.
            const forca = abertas > 1 ? 100 - (i / (abertas - 1)) * 55 : 100;
            return (
              <li key={e.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{e.nome}</span>
                  <span className="shrink-0 text-text-muted tabular-nums">
                    <b className="font-semibold text-text">{formatarNumero(e.quantidade, "inteiro", idioma)}</b>
                    {e.ganha ? ` · ${t("ganhos no período")}` : ""}
                  </span>
                </div>
                <div className={cn(styles.trilho, "h-2.5 overflow-hidden rounded-full")}>
                  <div
                    data-vg="funil-barra"
                    className={cn(e.ganha ? styles.barraGanha : styles.barraFunil, "h-full rounded-full")}
                    style={
                      {
                        width: `${e.quantidade > 0 ? Math.max((e.quantidade / maior) * 100, 3) : 0}%`,
                        "--vg-forca": `${forca}%`,
                      } as CSSProperties
                    }
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {funil && etapas.length > 0 && (
        <Link
          href="/app/kanban"
          className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-semibold hover:underline"
        >
          {t("Abrir o funil")}
          <ArrowRight size={14} aria-hidden />
        </Link>
      )}
    </article>
  );
}

// ─── Precisa de você ─────────────────────────────────────────────────────────

export function Fila({
  fila,
  referencia,
  falhou,
}: {
  fila: VisaoGeralDados["fila"];
  referencia: string;
  falhou: boolean;
}) {
  const t = useT();
  const idioma = useIdioma();

  return (
    <article data-vg-entra="" data-vg="painel" className={cn(styles.cartao, CARTAO)}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold">{t("Precisa de você")}</h2>
          {fila.total > 0 && (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning-fg tabular-nums">
              {formatarNumero(fila.total, "inteiro", idioma)}
            </span>
          )}
        </div>
        <Link
          href="/app/inbox?filter=unassigned"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text"
        >
          {t("Abrir a Fila")}
          <ArrowRight size={14} aria-hidden />
        </Link>
      </header>

      {falhou ? (
        <Falhou />
      ) : fila.itens.length === 0 ? (
        <div className="flex flex-1 items-center gap-3 rounded-xl bg-success-bg px-4 py-5 text-success-fg">
          <CheckCircle size={22} weight="fill" aria-hidden />
          <p className="text-sm font-semibold">{t("Ninguém esperando por uma pessoa agora.")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {fila.itens.map((c) => (
            <li
              key={c.id}
              data-vg="item"
              data-vg-item-id={c.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3"
            >
              <span className="w-1 self-stretch rounded-full bg-warning" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{c.contato.nome}</span>
                <span className="truncate text-xs text-text-muted">{t(c.motivo)}</span>
              </span>
              <span className="hidden shrink-0 text-xs font-semibold text-warning-fg sm:inline">
                {tempoRelativo(c.desde, referencia, idioma, t)}
              </span>
              <Link
                href={`/app/inbox/${c.id}`}
                className="shrink-0 rounded-lg bg-text px-3 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                {t("Atender")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
