/**
 * Formatação da Visão geral, no idioma de quem lê.
 *
 * Datas e horas saem de `partesNoFuso` (dígitos montados aqui), não de
 * `toLocaleString`: a tela é renderizada no servidor E no navegador, e duas
 * versões de ICU formatando a mesma hora de jeitos ligeiramente diferentes
 * quebrariam a hidratação. Número e moeda passam pelo `Intl`, como no resto do
 * produto.
 *
 * O "agora" de todo tempo relativo é `geradoEm` — o instante em que o servidor
 * leu os números — e não o relógio de quem renderiza, pelo mesmo motivo.
 */
import { formatDistanceStrict } from "date-fns";

import { partesNoFuso } from "@/lib/agenda/fuso";
import { localeDeData, tagDeIdioma } from "@/lib/i18n/datas";
import type { Idioma } from "@/lib/i18n/idiomas";
import type { FormatoDoNumero, Variacao } from "@/lib/visao-geral/tipos";

const dois = (n: number) => String(n).padStart(2, "0");

export function formatarNumero(
  valor: number,
  formato: FormatoDoNumero,
  idioma: Idioma,
  moeda = "BRL",
): string {
  const tag = tagDeIdioma(idioma);
  if (formato === "percentual") {
    return new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 }).format(valor);
  }
  if (formato === "moeda") {
    const reais = valor / 100;
    const grande = Math.abs(reais) >= 100_000;
    // Centavos só onde eles dizem alguma coisa: "R$ 189,90" e "R$ 249", nunca
    // "R$ 189,9" (casa decimal cortada) nem "R$ 48.957,30" num indicador.
    const centavos = !grande && Math.abs(reais) < 1_000 && !Number.isInteger(reais) ? 2 : 0;
    return new Intl.NumberFormat(tag, {
      style: "currency",
      currency: moeda,
      notation: grande ? "compact" : "standard",
      maximumFractionDigits: grande ? 1 : centavos,
      minimumFractionDigits: centavos,
    }).format(reais);
  }
  return new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(Math.round(valor));
}

/** "+12%", "−3 p.p.", "novo". O sinal é o caractere de menos, não o hífen. */
export function formatarVariacao(
  v: Variacao,
  idioma: Idioma,
  t: (texto: string) => string,
): string {
  if (v.tipo === "novo") return t("novo no período");
  const tag = tagDeIdioma(idioma);
  const sinal = v.valor > 0 ? "+" : v.valor < 0 ? "−" : "";
  if (v.tipo === "pontos") {
    const pontos = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(Math.abs(v.valor * 100));
    return `${sinal}${pontos} p.p.`;
  }
  const pct = new Intl.NumberFormat(tag, {
    style: "percent",
    maximumFractionDigits: Math.abs(v.valor) < 0.1 ? 1 : 0,
  }).format(Math.abs(v.valor));
  return `${sinal}${pct}`;
}

/** A variação, lida contra o que é bom para quem olha. */
export function sentidoDaVariacao(v: Variacao | null, subirEhBom: boolean): "bom" | "ruim" | "neutro" {
  if (!v || v.tipo === "novo") return v ? (subirEhBom ? "bom" : "ruim") : "neutro";
  if (Math.abs(v.valor) < 0.005) return "neutro";
  return v.valor > 0 === subirEhBom ? "bom" : "ruim";
}

/** "há 3 minutos" / "hace 3 minutos", contra o instante em que os números foram lidos. */
export function tempoRelativo(
  iso: string | null,
  referencia: string,
  idioma: Idioma,
  t: (texto: string) => string,
): string {
  if (!iso) return "—";
  const quando = new Date(iso);
  const agora = new Date(referencia);
  if (agora.getTime() - quando.getTime() < 60_000) return t("agora");
  return formatDistanceStrict(quando, agora, {
    addSuffix: true,
    roundingMethod: "floor",
    locale: localeDeData(idioma),
  });
}

/** "21:14", no fuso de quem olha. */
export function horaNoFuso(iso: string, fuso: string): string {
  const p = partesNoFuso(new Date(iso), fuso);
  return `${dois(p.hora)}:${dois(p.minuto)}`;
}

/** "Hoje, 21:14" · "Ontem, 18:05" · "03/10, 14:00". */
export function quandoCurto(
  iso: string | null,
  referencia: string,
  fuso: string,
  t: (texto: string) => string,
): string {
  if (!iso) return "—";
  const p = partesNoFuso(new Date(iso), fuso);
  const hoje = partesNoFuso(new Date(referencia), fuso);
  const ontem = partesNoFuso(new Date(new Date(referencia).getTime() - 86_400_000), fuso);
  const hora = `${dois(p.hora)}:${dois(p.minuto)}`;
  const mesmoDia = (a: typeof p) => a.ano === p.ano && a.mes === p.mes && a.dia === p.dia;
  if (mesmoDia(hoje)) return `${t("Hoje")}, ${hora}`;
  if (mesmoDia(ontem)) return `${t("Ontem")}, ${hora}`;
  return `${dois(p.dia)}/${dois(p.mes)}, ${hora}`;
}

const DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const DIA_LONGO = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

/** O dia da semana de uma chave `YYYY-MM-DD` — calendário puro, sem fuso. */
function diaDaSemana(chave: string): number {
  const [a, m, d] = chave.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d!)).getUTCDay();
}

/** O rótulo do eixo: "08h", "Seg", "03/10". */
export function rotuloDoBalde(
  chave: string,
  granularidade: "hora" | "dia",
  muitos: boolean,
  t: (texto: string) => string,
): string {
  if (granularidade === "hora") return `${chave.slice(11, 13)}h`;
  if (muitos) return `${chave.slice(8, 10)}/${chave.slice(5, 7)}`;
  return t(DIA_CURTO[diaDaSemana(chave)]!);
}

/** O rótulo longo, para a dica e o leitor de tela: "Terça-feira, 03/10" · "08h às 09h". */
export function rotuloLongoDoBalde(
  chave: string,
  granularidade: "hora" | "dia",
  t: (texto: string) => string,
): string {
  if (granularidade === "hora") {
    const h = Number(chave.slice(11, 13));
    return `${dois(h)}h ${t("às")} ${dois((h + 1) % 24)}h`;
  }
  return `${t(DIA_LONGO[diaDaSemana(chave)]!)}, ${chave.slice(8, 10)}/${chave.slice(5, 7)}`;
}

/** "Bom dia" / "Boa tarde" / "Boa noite", pela hora do fuso de quem olha. */
export function saudacao(referencia: string, fuso: string): string {
  const h = partesNoFuso(new Date(referencia), fuso).hora;
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}
