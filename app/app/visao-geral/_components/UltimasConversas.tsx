"use client";

import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DO_COMANDO } from "@/lib/inbox/comando-da-conversa";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { ArrowRight, ChatsCircle } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import type { LinhaRecente } from "@/lib/visao-geral/tipos";

import { formatarNumero, quandoCurto } from "./formatar";
import styles from "./visao-geral.module.css";

/** A cor da situação — a mesma leitura de "quem manda" do Inbox, em pílula. */
const PILULA: Record<LinhaRecente["comando"], string> = {
  automatico: styles.pilulaIa!,
  humano: "bg-text text-bg",
  aguardando: "bg-warning-bg text-warning-fg",
  encerrada: "bg-surface-elevated text-text-muted",
  ninguem: "bg-surface-elevated text-text-muted",
};

const PONTO: Record<LinhaRecente["comando"], string> = {
  automatico: styles.pontoIa!,
  humano: "bg-warning",
  aguardando: "bg-warning",
  encerrada: "bg-text-subtle",
  ninguem: "bg-text-subtle",
};

export function UltimasConversas({
  linhas,
  referencia,
  fuso,
  falhou,
}: {
  linhas: LinhaRecente[];
  referencia: string;
  fuso: string;
  falhou: boolean;
}) {
  const t = useT();
  const idioma = useIdioma();

  return (
    <section data-vg-entra="" data-vg="painel" className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">{t("Últimas conversas")}</h2>
        <Link
          href="/app/inbox?filter=all"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3.5 py-2 text-sm font-semibold hover:bg-surface-elevated"
        >
          {t("Abrir o Inbox")}
          <ArrowRight size={14} aria-hidden />
        </Link>
      </header>

      <div className={cn(styles.cartao, "overflow-x-auto rounded-2xl border border-border bg-surface")}>
        {falhou ? (
          <p className="p-5 text-sm text-text-muted">
            {t("Não foi possível carregar agora. Os números voltam na próxima atualização.")}
          </p>
        ) : linhas.length === 0 ? (
          <div className="flex items-center gap-3 p-6 text-sm text-text-muted">
            <ChatsCircle size={24} className="shrink-0 text-text-subtle" aria-hidden />
            {t("Nenhuma conversa ainda. Quando um cliente escrever no WhatsApp conectado, ela aparece aqui.")}
          </div>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-elevated text-left text-text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">{t("Quando")}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{t("Cliente")}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{t("Canal")}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{t("Etapa")}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{t("Situação")}</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">{t("Valor")}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{t("Atendido por")}</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr
                  key={l.id}
                  data-vg="linha"
                  data-vg-item-id={l.id}
                  className="border-t border-border transition-colors hover:bg-surface-elevated"
                >
                  <td className="whitespace-nowrap px-5 py-3 text-text-muted tabular-nums">
                    {quandoCurto(l.quando, referencia, fuso, t)}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/app/inbox/${l.id}`}
                      className="flex flex-col gap-0.5 rounded-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="truncate">{l.contato.nome}</span>
                      {l.contato.telefone && l.contato.telefone !== l.contato.nome && (
                        <span className="text-xs font-normal text-text-subtle tabular-nums">{l.contato.telefone}</span>
                      )}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-text-muted">{l.canal ?? "—"}</td>
                  <td className="px-5 py-3 text-text-muted">{l.etapa ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
                        PILULA[l.comando],
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", PONTO[l.comando])} aria-hidden />
                      {t(ROTULO_DO_COMANDO[l.comando])}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums">
                    {l.valorCentavos != null
                      ? formatarNumero(l.valorCentavos, "moeda", idioma, l.moeda ?? "BRL")
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-text-muted">
                    {l.comando === "humano"
                      ? (l.atendente ?? t("Equipe"))
                      : l.comando === "automatico"
                        ? t("IA")
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
