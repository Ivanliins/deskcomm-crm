/**
 * As contas da Visão geral — puras, sem banco, para serem testáveis com
 * números escritos à mão. Quem lê o banco é `carregar.ts`; quem desenha é a
 * tela. Aqui só mora o que transforma linha em número honesto.
 */
import {
  ehIdentificadorTecnico,
  SEM_NOME,
  type ContatoNomeavel,
} from "@/lib/contacts/rotulo-do-contato";

import type { ContatoResumido, Variacao } from "./tipos";

/**
 * Variação relativa contra a janela anterior. Anterior zero não vira "+∞%":
 * com algo agora é `novo`, com nada nos dois lados não há o que comparar.
 */
export function variacaoRelativa(atual: number, anterior: number): Variacao | null {
  if (anterior === 0) return atual > 0 ? { tipo: "novo" } : null;
  return { tipo: "percentual", valor: (atual - anterior) / anterior };
}

/** Parte sobre total, ou `null` quando não há total — 0% e "sem base" são coisas diferentes. */
export function taxa(parte: number, total: number): number | null {
  return total > 0 ? parte / total : null;
}

/** Diferença entre duas taxas, em pontos (0,04 = +4 p.p.). */
export function variacaoEmPontos(atual: number | null, anterior: number | null): Variacao | null {
  if (atual == null || anterior == null) return null;
  return { tipo: "pontos", valor: atual - anterior };
}

export interface LinhaDeVenda {
  value_cents: number | null;
  currency: string | null;
}

export interface SomaDeVendas {
  centavos: number;
  moeda: string;
  /** Negócios ganhos NA MOEDA somada. */
  quantidade: number;
}

/**
 * Soma o valor dos negócios ganhos numa moeda só.
 *
 * Somar real com dólar daria um número que não existe. A moeda é a que mais
 * aparece no período (empate fica com a primeira vista); `moeda` força uma —
 * é como a janela anterior é somada na MESMA moeda da atual, senão a variação
 * compararia grandezas diferentes. Moeda vazia é BRL, a mesma convenção do
 * quadro do funil (`components/kanban/KanbanCard.tsx`).
 */
export function somarVendas(linhas: readonly LinhaDeVenda[], moeda?: string): SomaDeVendas {
  const porMoeda = new Map<string, { centavos: number; quantidade: number }>();
  for (const l of linhas) {
    const m = (l.currency ?? "BRL").toUpperCase();
    const acc = porMoeda.get(m) ?? { centavos: 0, quantidade: 0 };
    acc.centavos += l.value_cents ?? 0;
    acc.quantidade += 1;
    porMoeda.set(m, acc);
  }
  let escolhida = moeda?.toUpperCase();
  if (!escolhida) {
    let maior = -1;
    for (const [m, acc] of porMoeda) {
      if (acc.quantidade > maior) {
        maior = acc.quantidade;
        escolhida = m;
      }
    }
  }
  const final = escolhida ?? "BRL";
  const acc = porMoeda.get(final) ?? { centavos: 0, quantidade: 0 };
  return { centavos: acc.centavos, moeda: final, quantidade: acc.quantidade };
}

/**
 * O telefone para uma tela que pode estar num monitor da loja: DDD e os quatro
 * últimos dígitos, o bastante para reconhecer quem é sem expor o número.
 * `null` quando o que veio não tem cara de telefone (ex.: um identificador do
 * WhatsApp sem número).
 */
export function mascararTelefone(bruto: string | null | undefined): string | null {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  if (digitos.length < 8 || digitos.length > 15) return null;
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    const ddd = digitos.slice(2, 4);
    const resto = digitos.slice(4);
    const primeiro = resto.length === 9 ? resto[0] : "";
    return `(${ddd}) ${primeiro}••••-${resto.slice(-4)}`;
  }
  return `••• ${digitos.slice(-4)}`;
}

function iniciaisDe(nome: string): string {
  const palavras = nome
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const letras = palavras.slice(0, 2).map((p) => p[0]!.toUpperCase());
  return letras.join("") || "•";
}

/**
 * Nome, telefone mascarado e iniciais de um contato.
 *
 * Segue a ordem de `rotuloDoContato` (o que uma pessoa escolheu, depois o que o
 * canal informou), mas cai no telefone MASCARADO em vez do completo: o rótulo
 * do Inbox é para quem vai responder; este é para um resumo.
 */
export function resumirContato(
  c: ContatoNomeavel | null | undefined,
  t: (texto: string) => string = (texto) => texto,
): ContatoResumido {
  const telefone = mascararTelefone(c?.phone_number);
  for (const bruto of [c?.display_name, c?.name]) {
    const v = (bruto ?? "").trim();
    if (v !== "" && !ehIdentificadorTecnico(v)) {
      return { nome: v, telefone, iniciais: iniciaisDe(v) };
    }
  }
  return { nome: telefone ?? t(SEM_NOME), telefone, iniciais: "•" };
}

/**
 * Por que a conversa espera uma pessoa, em palavras — a CHAVE de `t()`.
 *
 * O motivo gravado pela passagem de bastão (`HandoffReason` em
 * `lib/ai/handoff/orchestrator.ts`) é o mais específico que existe. Motivo
 * desconhecido (texto livre da ferramenta MCP, por exemplo) cai no genérico em
 * vez de aparecer cru na tela.
 */
export const MOTIVO_DA_PASSAGEM: Record<string, string> = {
  requested_human: "Pediu para falar com uma pessoa",
  low_sentiment: "Conversa com sinal de insatisfação",
  low_confidence: "A IA não teve certeza da resposta",
  critical_stage: "Chegou a uma etapa que pede uma pessoa",
  legal_mention: "Mencionou uma questão jurídica",
  refund_mention: "Falou em reembolso",
  orcamento_de_ia: "Teto de gasto com IA atingido",
};
