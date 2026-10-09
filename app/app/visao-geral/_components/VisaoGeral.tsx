"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { ArrowRight, ArrowsClockwise, WhatsappLogo } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import { PERIODO_PADRAO, PERIODOS, type Periodo } from "@/lib/visao-geral/periodo";
import type { VisaoGeralDados } from "@/lib/visao-geral/tipos";

import { GraficoDeRespostas } from "./GraficoDeRespostas";
import { Indicadores } from "./Indicadores";
import { Fila, Funil, IaAoVivo } from "./Paineis";
import { UltimasConversas } from "./UltimasConversas";
import { horaNoFuso, saudacao } from "./formatar";
import type * as MovimentoModulo from "./movimento";
import styles from "./visao-geral.module.css";

type Movimento = typeof MovimentoModulo;

/** De quanto em quanto tempo a tela relê os números enquanto está visível. */
const INTERVALO_MS = 60_000;

const ROTULO_DO_PERIODO: Record<Periodo, string> = {
  hoje: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
};

export function VisaoGeral({
  dados,
  nome,
  podeConectar,
  podeConfigurarIa,
}: {
  dados: VisaoGeralDados;
  nome: string | null;
  podeConectar: boolean;
  podeConfigurarIa: boolean;
}) {
  const t = useT();
  const idioma = useIdioma();
  const router = useRouter();
  const caminho = usePathname();
  const [pendente, startTransition] = useTransition();
  const raiz = useRef<HTMLDivElement>(null);
  const [movimento, setMovimento] = useState<"pendente" | "pronto">("pendente");
  const motor = useRef<Movimento | null>(null);
  const desfazerEntrada = useRef<(() => void) | null>(null);
  const anterior = useRef<VisaoGeralDados | null>(null);
  const geradoEm = useRef(dados.geradoEm);
  const [realcados, setRealcados] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    geradoEm.current = dados.geradoEm;
  }, [dados.geradoEm]);

  // Entrada: o GSAP chega por `import()` para sair do bundle da primeira pintura.
  // Até lá o CSS segura os blocos invisíveis (`data-movimento="pendente"`), com
  // uma revelação de segurança se o módulo não chegar.
  useEffect(() => {
    let vivo = true;
    import("./movimento")
      .then((m) => {
        if (!vivo || !raiz.current) return;
        motor.current = m;
        desfazerEntrada.current = m.animarEntrada(raiz.current, idioma);
        setMovimento("pronto");
      })
      .catch(() => setMovimento("pronto"));
    return () => {
      vivo = false;
      desfazerEntrada.current?.();
      desfazerEntrada.current = null;
    };
    // A entrada é uma vez por visita; o idioma não muda sem recarregar a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualização: só a diferença se mexe (ver `movimento.ts`). Layout effect para
  // o número antigo voltar ao lugar ANTES de o novo ser pintado.
  useLayoutEffect(() => {
    const antes = anterior.current;
    anterior.current = dados;
    if (!antes || antes.geradoEm === dados.geradoEm || !raiz.current || !motor.current) return;
    desfazerEntrada.current?.();
    desfazerEntrada.current = null;
    const desfazer = motor.current.animarAtualizacao(raiz.current, antes, dados, idioma);
    const mudaram = new Set(
      dados.indicadores
        .filter((i) => {
          const velho = antes.indicadores.find((x) => x.id === i.id);
          return velho != null && velho.valor !== i.valor && antes.periodo === dados.periodo;
        })
        .map((i) => i.id),
    );
    setRealcados(mudaram);
    const apagar = window.setTimeout(() => setRealcados(new Set()), 1_800);
    return () => {
      window.clearTimeout(apagar);
      desfazer();
    };
  }, [dados, idioma]);

  // Releitura automática, só com a aba visível — painel aberto num monitor da
  // loja não pode virar uma consulta por minuto para sempre em segundo plano.
  useEffect(() => {
    const reler = () => {
      if (document.visibilityState !== "visible") return;
      startTransition(() => router.refresh());
    };
    const intervalo = window.setInterval(reler, INTERVALO_MS);
    const aoVoltar = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - new Date(geradoEm.current).getTime() > INTERVALO_MS / 2
      ) {
        reler();
      }
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [router]);

  const trocarPeriodo = (p: Periodo) => {
    if (p === dados.periodo) return;
    startTransition(() =>
      router.replace(p === PERIODO_PADRAO ? caminho : `${caminho}?periodo=${p}`, { scroll: false }),
    );
  };

  const falhou = (bloco: string) => dados.falhas.includes(bloco);
  const primeiraVez = dados.canais.total === 0 && !falhou("canais");

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={raiz}
        data-movimento={movimento}
        aria-busy={pendente}
        className={cn(styles.raiz, "@container mx-auto flex w-full max-w-[1440px] flex-col gap-6 lg:p-2")}
      >
        <header
          data-vg-entra=""
          data-vg="cabecalho"
          className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-sm font-medium text-text-muted">
              {t(saudacao(dados.geradoEm, dados.fuso))}
              {nome ? `, ${nome}` : ""}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{t("Visão geral")}</h1>
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <span className={styles.vivo} aria-hidden />
              {t("Ao vivo")} · {t("atualizado às")} {horaNoFuso(dados.geradoEm, dados.fuso)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label={t("Período")}
              className="flex rounded-xl border border-border bg-surface p-1"
            >
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={p === dados.periodo}
                  onClick={() => trocarPeriodo(p)}
                  className={cn(
                    "min-h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors duration-fast",
                    p === dados.periodo
                      ? "bg-text text-bg"
                      : "text-text-muted hover:bg-surface-elevated hover:text-text",
                  )}
                >
                  {t(ROTULO_DO_PERIODO[p])}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => startTransition(() => router.refresh())}
              aria-label={t("Atualizar agora")}
              title={t("Atualizar agora")}
              className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-text-muted transition-colors duration-fast hover:text-text"
            >
              <ArrowsClockwise size={18} className={cn(pendente && "animate-spin")} aria-hidden />
            </button>
          </div>
        </header>

        {primeiraVez && (
          <section
            data-vg-entra=""
            data-vg="painel"
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-5"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <WhatsappLogo size={26} weight="fill" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="text-base font-semibold">{t("Conecte o WhatsApp da sua loja")}</h2>
              <p className="text-sm text-text-muted">
                {t("É por ele que as conversas chegam. Assim que o primeiro cliente escrever, os números desta tela começam a se mexer.")}
              </p>
            </div>
            {podeConectar ? (
              <Link
                href="/app/connections"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                {t("Conectar WhatsApp")}
                <ArrowRight size={14} aria-hidden />
              </Link>
            ) : (
              <p className="text-sm text-text-muted">{t("Peça a um administrador para conectar.")}</p>
            )}
          </section>
        )}

        <div className={cn("flex flex-col gap-6 transition-opacity duration-base", pendente && "opacity-60")}>
          <Indicadores indicadores={dados.indicadores} periodo={dados.periodo} realcados={realcados} />

          <div className="grid gap-4 @4xl:grid-cols-3">
            <GraficoDeRespostas
              className="@4xl:col-span-2"
              baldes={dados.serie.baldes}
              granularidade={dados.granularidade}
              parcial={dados.serie.parcial}
              falhou={falhou("serie") || falhou("numeros")}
            />
            <IaAoVivo
              ia={dados.ia}
              referencia={dados.geradoEm}
              podeConfigurarIa={podeConfigurarIa}
              falhou={falhou("ia")}
            />
          </div>

          <div className="grid gap-4 @3xl:grid-cols-2">
            <Funil funil={dados.funil} falhou={falhou("funil")} />
            <Fila fila={dados.fila} referencia={dados.geradoEm} falhou={falhou("fila")} />
          </div>

          <UltimasConversas
            linhas={dados.recentes}
            referencia={dados.geradoEm}
            fuso={dados.fuso}
            falhou={falhou("recentes")}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
