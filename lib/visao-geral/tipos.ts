/**
 * O que a Visão geral entrega à tela — tudo serializável (datas em ISO), porque
 * atravessa a fronteira servidor → cliente como prop.
 *
 * Números, nunca textos prontos: quem formata é a tela, no idioma de quem lê.
 * A única exceção são os rótulos que vêm do BANCO (nome de etapa, nome do
 * contato), que são dado e saem como foram cadastrados.
 */
import type { ComandoDoBanco } from "@/lib/inbox/comando-da-conversa";

import type { Periodo } from "./periodo";

export type FormatoDoNumero = "inteiro" | "percentual" | "moeda";

/**
 * Como o número se mexeu contra a janela anterior.
 *
 * `percentual` é variação relativa (0,12 = +12%); `pontos` é diferença entre
 * duas porcentagens (0,04 = +4 p.p.) — dizer "+4%" sobre uma taxa seria ambíguo;
 * `novo` é o caso em que a janela anterior foi ZERO, onde qualquer porcentagem
 * seria divisão por zero fantasiada de número.
 */
export type Variacao =
  | { tipo: "percentual"; valor: number }
  | { tipo: "pontos"; valor: number }
  | { tipo: "novo" };

export type IdDoIndicador = "atendimentos" | "respostas_ia" | "vendas" | "leads" | "aguardando";

export interface Indicador {
  id: IdDoIndicador;
  /** `null` = não há base para o número (ex.: % da IA sem nenhuma resposta enviada). */
  valor: number | null;
  formato: FormatoDoNumero;
  /** Código ISO 4217, só em `formato: "moeda"`. */
  moeda?: string;
  /** `null` = sem comparação possível (o número é um retrato de agora, ou não há base). */
  variacao: Variacao | null;
  /** Subir é bom? Decide a cor da variação — mais gente esperando não é verde. */
  subirEhBom: boolean;
  /** Um valor por balde do período; `null` quando o indicador é um retrato de agora. */
  serie: number[] | null;
  /** Um número de apoio, quando o indicador tem um (ex.: quantos negócios fecharam). */
  apoio?: number;
}

export interface BaldeDaSerie {
  chave: string;
  de: string;
  ate: string;
  /** Mensagens enviadas pela IA no balde. */
  ia: number;
  /** Mensagens enviadas por gente — pelo sistema ou pelo celular da loja. */
  equipe: number;
}

export interface EtapaDoFunil {
  id: string;
  nome: string;
  quantidade: number;
  /** Etapa de ganho: a contagem é de quem FECHOU no período, não de quem está parado nela. */
  ganha: boolean;
}

export interface ContatoResumido {
  nome: string;
  /** Telefone mascarado para a tela — `(11) 9••••-4821`. `null` sem número. */
  telefone: string | null;
  iniciais: string;
}

export interface ConversaNaFila {
  id: string;
  contato: ContatoResumido;
  /** Desde quando a pessoa espera: a última mensagem DELA. */
  desde: string | null;
  /** Por que a conversa está com uma pessoa — já como chave de `t()`. */
  motivo: string;
}

export interface ConversaDaIa {
  id: string;
  contato: ContatoResumido;
  quando: string | null;
  previa: string | null;
  /** Quem falou por último: o cliente (a IA vai responder) ou a IA. */
  ultimo: "cliente" | "ia";
}

export interface LinhaRecente {
  id: string;
  contato: ContatoResumido;
  quando: string | null;
  /** Nome (ou número) do WhatsApp da loja por onde a conversa entrou. */
  canal: string | null;
  comando: ComandoDoBanco | "ninguem";
  atendente: string | null;
  etapa: string | null;
  valorCentavos: number | null;
  moeda: string | null;
}

export interface VisaoGeralDados {
  geradoEm: string;
  periodo: Periodo;
  granularidade: "hora" | "dia";
  fuso: string;
  indicadores: Indicador[];
  serie: {
    baldes: BaldeDaSerie[];
    /** A série bateu no teto de linhas lidas — os baldes mais antigos podem estar incompletos. */
    parcial: boolean;
  };
  funil: { nome: string; etapas: EtapaDoFunil[] } | null;
  fila: { total: number; itens: ConversaNaFila[] };
  ia: {
    /** `false` = a organização não tem nenhum agente de IA no ar. `null` = não deu para saber. */
    noAr: boolean | null;
    total: number;
    itens: ConversaDaIa[];
  };
  recentes: LinhaRecente[];
  canais: { total: number; conectados: number };
  /** Blocos que não carregaram. A tela diz isso em vez de mostrar zero. */
  falhas: string[];
}
