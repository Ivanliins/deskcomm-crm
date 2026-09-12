"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, FunnelSimple, Robot, ShieldCheck, Timer } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import styles from "../page.module.css";

const ABAS = [
  {
    id: "atendimento",
    rotulo: "Atendimento com IA",
    icone: Robot,
    titulo: "Agente que atende no seu tom",
    corpo: "Cada mensagem passa pela base de conhecimento da sua empresa antes de sair — o agente não inventa prazo nem política que não existe.",
    pontos: [
      "Base de conhecimento por tenant",
      "Resposta em segundos, 24 horas por dia",
      "Passa pra um humano quando precisa",
      "Sete verificações antes de enviar",
    ],
  },
  {
    id: "funil",
    rotulo: "Funil automático",
    icone: FunnelSimple,
    titulo: "O lead se move sozinho",
    corpo: "Qualificado pelo agente, o lead avança de etapa sem alguém arrastar cartão. Se esfriar, o Radar sinaliza o risco antes de virar prejuízo.",
    pontos: [
      "Qualificação automática pela IA",
      "Etapas por pipeline, sem código",
      "Radar de risco de esfriamento",
      "Timeline unificada por lead",
    ],
  },
  {
    id: "seguranca",
    rotulo: "Segurança & LGPD",
    icone: ShieldCheck,
    titulo: "Auditável por padrão, não por esforço",
    corpo: "Isolamento entre organizações testado a cada mudança de schema, e toda mutação relevante vira uma linha de auditoria — sem configurar nada.",
    pontos: [
      "Multi-tenant com RLS testada no CI",
      "Audit log em toda mutação",
      "Anonimização de dados sob pedido",
      "LGPD nativa desde o dia 1",
    ],
  },
  {
    id: "antibanimento",
    rotulo: "Anti-banimento",
    icone: Timer,
    titulo: "Throttle pensado pra não perder o número",
    corpo: "Envio pausado, jitter e warm-up progressivo — porque o WhatsApp bane padrão de robô, não velocidade de atendimento.",
    pontos: [
      "Throttle de 1 mensagem a cada 1,2s",
      "Warm-up progressivo de 7 a 14 dias",
      "Janela de horário configurável por canal",
      "Spinning de copy pra variar o texto",
    ],
  },
] as const;

/**
 * Recursos em abas (adaptado do feature-18 do kit SaasAble): cada aba troca
 * um painel de descrição + checklist. O original mostrava uma captura de
 * tela do produto do lado esquerdo — aqui vira um selo com o ícone da aba
 * sobre a textura de pontos, nunca uma imagem fake do produto que não existe.
 */
export function FeatureTabs() {
  const [ativa, setAtiva] = useState<string>(ABAS[0].id);
  const aba = ABAS.find((item) => item.id === ativa) ?? ABAS[0];
  const Icone = aba.icone;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-center gap-2 rounded-full border border-border bg-surface-elevated/60 p-1.5 sm:inline-flex sm:self-center">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAtiva(item.id)}
            aria-pressed={item.id === ativa}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
              item.id === ativa
                ? "bg-bg text-text shadow-sm"
                : "text-muted-foreground hover:text-text"
            }`}
          >
            <item.icone size={16} weight={item.id === ativa ? "duotone" : "regular"} aria-hidden="true" />
            {item.rotulo}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex basis-full items-center justify-center rounded-xl border border-border bg-surface-elevated p-8 sm:basis-5/12 sm:p-10">
          <span className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-bg ${styles.featureDots}`}>
            <Icone size={40} weight="duotone" className="text-accent-500" aria-hidden="true" />
          </span>
        </div>
        <div className="flex basis-full flex-col justify-between gap-6 rounded-xl border border-border bg-surface-elevated p-6 sm:basis-7/12 sm:p-8">
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-semibold tracking-tight">{aba.titulo}</h3>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{aba.corpo}</p>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {aba.pontos.map((ponto) => (
                <li key={ponto} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  {ponto}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="#faq">Ver perguntas frequentes</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="#precos">Começar teste grátis</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
