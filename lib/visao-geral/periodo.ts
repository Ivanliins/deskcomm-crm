/**
 * O PERÍODO DA VISÃO GERAL — três janelas, cada uma com a sua anterior.
 *
 * ## Por que só três
 *
 * "Hoje", "7 dias" e "30 dias" são as perguntas que o dono de loja faz ao abrir
 * o painel: como está o dia, como foi a semana, como vai o mês. Um seletor de
 * datas livre seria configuração antes de haver uso — e cada período a mais é
 * um tamanho de varredura a mais no banco de uma VPS de 2 GB.
 *
 * ## A janela anterior tem o MESMO comprimento
 *
 * "Hoje" às 15h compara com ontem das 0h às 15h, não com o dia inteiro de
 * ontem: comparar 15 horas com 24 faria todo dia parecer uma queda até a noite.
 * Pelo mesmo motivo "7 dias" é hoje mais os seis anteriores, até agora, contra
 * os sete dias de antes disso.
 *
 * ## O dia é o do FUSO de quem olha
 *
 * Agrupar por dia em UTC jogaria o que aconteceu às 21h de Brasília no dia
 * seguinte. As fronteiras saem de `instanteDe` (`lib/agenda/fuso.ts`), que já
 * sabe atravessar horário de verão.
 */
import { instanteDe, partesNoFuso } from "@/lib/agenda/fuso";

export const PERIODOS = ["hoje", "7d", "30d"] as const;
export type Periodo = (typeof PERIODOS)[number];
export const PERIODO_PADRAO: Periodo = "7d";

/** Lê o `?periodo=` da URL. Qualquer coisa fora da lista vira o padrão, sem erro. */
export function lerPeriodo(bruto: unknown): Periodo {
  return typeof bruto === "string" && (PERIODOS as readonly string[]).includes(bruto)
    ? (bruto as Periodo)
    : PERIODO_PADRAO;
}

export interface Janela {
  /** Início, inclusivo. */
  de: Date;
  /** Fim, exclusivo. */
  ate: Date;
}

export interface Balde extends Janela {
  /** `YYYY-MM-DD` (dia) ou `YYYY-MM-DDTHH` (hora), no fuso — chave estável. */
  chave: string;
}

export interface JanelasDoPeriodo {
  periodo: Periodo;
  granularidade: "hora" | "dia";
  atual: Janela;
  anterior: Janela;
  /** Os baldes da série, em ordem, cobrindo `atual` inteira. */
  baldes: Balde[];
}

const DIAS: Record<Exclude<Periodo, "hoje">, number> = { "7d": 7, "30d": 30 };

const dois = (n: number) => String(n).padStart(2, "0");

/**
 * O dia civil `k` dias antes do de `agora`, já normalizado (virada de mês e
 * de ano). A conta vai em UTC puro porque é aritmética de CALENDÁRIO, não de
 * instante — o fuso só entra quando o dia vira instante, em `instanteDe`.
 */
function diaCivil(agora: Date, fuso: string, k: number): { ano: number; mes: number; dia: number } {
  const p = partesNoFuso(agora, fuso);
  const d = new Date(Date.UTC(p.ano, p.mes - 1, p.dia - k));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

export function janelasDoPeriodo(periodo: Periodo, agora: Date, fuso: string): JanelasDoPeriodo {
  if (periodo === "hoje") {
    const hoje = diaCivil(agora, fuso, 0);
    const de = instanteDe(hoje, fuso);
    const horaAgora = partesNoFuso(agora, fuso).hora;
    const baldes: Balde[] = [];
    for (let h = 0; h <= horaAgora; h++) {
      const inicio = instanteDe({ ...hoje, hora: h }, fuso);
      const fim = h === horaAgora ? agora : instanteDe({ ...hoje, hora: h + 1 }, fuso);
      baldes.push({
        de: inicio,
        ate: fim,
        chave: `${hoje.ano}-${dois(hoje.mes)}-${dois(hoje.dia)}T${dois(h)}`,
      });
    }
    return {
      periodo,
      granularidade: "hora",
      atual: { de, ate: agora },
      anterior: anteriorDe(agora, fuso, 1, de),
      baldes,
    };
  }

  const n = DIAS[periodo];
  const baldes: Balde[] = [];
  for (let k = n - 1; k >= 0; k--) {
    const dia = diaCivil(agora, fuso, k);
    const inicio = instanteDe(dia, fuso);
    const fim = k === 0 ? agora : instanteDe(diaCivil(agora, fuso, k - 1), fuso);
    baldes.push({ de: inicio, ate: fim, chave: `${dia.ano}-${dois(dia.mes)}-${dois(dia.dia)}` });
  }
  const de = baldes[0]!.de;
  return {
    periodo,
    granularidade: "dia",
    atual: { de, ate: agora },
    anterior: anteriorDe(agora, fuso, n, de),
    baldes,
  };
}

/**
 * A janela atual recuada `dias` dias de CALENDÁRIO: começa na meia-noite local
 * equivalente e dura exatamente o mesmo tanto. É o "até esta hora" — às 15h20,
 * "Hoje" compara com ontem das 0h às 15h20, e "7 dias" com os sete dias
 * anteriores até as 15h20 do último deles.
 */
function anteriorDe(agora: Date, fuso: string, dias: number, de: Date): Janela {
  const inicio = instanteDe(diaCivil(agora, fuso, 2 * dias - 1), fuso);
  return { de: inicio, ate: new Date(inicio.getTime() + (agora.getTime() - de.getTime())) };
}

/**
 * Em que balde cai o instante — busca binária, porque uma série de 30 dias
 * recebe milhares de instantes. `-1` quando está fora da janela.
 */
export function indiceDoBalde(instante: Date, baldes: readonly Janela[]): number {
  const t = instante.getTime();
  let lo = 0;
  let hi = baldes.length - 1;
  while (lo <= hi) {
    const meio = (lo + hi) >> 1;
    const b = baldes[meio]!;
    if (t < b.de.getTime()) hi = meio - 1;
    else if (t >= b.ate.getTime()) lo = meio + 1;
    else return meio;
  }
  return -1;
}

/** Quantos instantes caem em cada balde. Instantes fora da janela são ignorados. */
export function contarPorBalde(instantes: Iterable<string | null>, baldes: readonly Janela[]): number[] {
  const contagem = baldes.map(() => 0);
  for (const bruto of instantes) {
    if (!bruto) continue;
    const i = indiceDoBalde(new Date(bruto), baldes);
    if (i >= 0) contagem[i]! += 1;
  }
  return contagem;
}
