import { describe, expect, it } from "vitest";

import { lerLinhas } from "./paginas";
import {
  mascararTelefone,
  MOTIVO_DA_PASSAGEM,
  resumirContato,
  somarVendas,
  taxa,
  variacaoEmPontos,
  variacaoRelativa,
} from "./montar";

describe("variações", () => {
  it("relativa contra a janela anterior", () => {
    expect(variacaoRelativa(120, 100)).toEqual({ tipo: "percentual", valor: 0.2 });
    expect(variacaoRelativa(50, 100)).toEqual({ tipo: "percentual", valor: -0.5 });
  });

  it("anterior zero não vira divisão por zero: é 'novo' ou não há comparação", () => {
    expect(variacaoRelativa(5, 0)).toEqual({ tipo: "novo" });
    expect(variacaoRelativa(0, 0)).toBeNull();
  });

  it("taxa sem total é 'sem base', não 0%", () => {
    expect(taxa(0, 0)).toBeNull();
    expect(taxa(0, 10)).toBe(0);
    expect(taxa(9, 10)).toBe(0.9);
  });

  it("diferença entre taxas é em pontos, e some quando um lado não tem base", () => {
    const v = variacaoEmPontos(0.92, 0.88);
    expect(v?.tipo).toBe("pontos");
    expect(v && v.tipo === "pontos" ? v.valor : NaN).toBeCloseTo(0.04);
    expect(variacaoEmPontos(null, 0.5)).toBeNull();
  });
});

describe("somarVendas", () => {
  it("soma numa moeda só — a que mais aparece — e moeda vazia é BRL", () => {
    const soma = somarVendas([
      { value_cents: 10_000, currency: "BRL" },
      { value_cents: 5_000, currency: null },
      { value_cents: 99_999, currency: "USD" },
    ]);
    expect(soma).toEqual({ centavos: 15_000, moeda: "BRL", quantidade: 2 });
  });

  it("a janela anterior é somada na moeda da atual", () => {
    expect(somarVendas([{ value_cents: 700, currency: "USD" }], "BRL")).toEqual({
      centavos: 0,
      moeda: "BRL",
      quantidade: 0,
    });
  });

  it("negócio ganho sem valor conta como negócio, soma zero", () => {
    expect(somarVendas([{ value_cents: null, currency: null }])).toEqual({
      centavos: 0,
      moeda: "BRL",
      quantidade: 1,
    });
  });
});

describe("contato para o resumo", () => {
  it("mascara o telefone brasileiro: DDD e os quatro últimos", () => {
    expect(mascararTelefone("+5511987654821")).toBe("(11) 9••••-4821");
    expect(mascararTelefone("553284793302")).toBe("(32) ••••-3302");
    expect(mascararTelefone("+14155550123")).toBe("••• 0123");
    expect(mascararTelefone("123")).toBeNull();
    expect(mascararTelefone(null)).toBeNull();
  });

  it("usa o nome escolhido; sem nome, o telefone MASCARADO, nunca o completo", () => {
    expect(resumirContato({ display_name: "Júlia Martins", phone_number: "+5511987654821" })).toEqual({
      nome: "Júlia Martins",
      telefone: "(11) 9••••-4821",
      iniciais: "JM",
    });
    const semNome = resumirContato({ name: "5511987654821@c.us", phone_number: "+5511987654821" });
    expect(semNome.nome).toBe("(11) 9••••-4821");
    expect(semNome.nome).not.toContain("98765");
  });

  it("sem nada apresentável, admite que não sabe o nome", () => {
    expect(resumirContato(null, () => "Sin nombre").nome).toBe("Sin nombre");
  });

  it("todo motivo de passagem conhecido tem texto", () => {
    for (const motivo of [
      "requested_human",
      "low_sentiment",
      "low_confidence",
      "critical_stage",
      "legal_mention",
      "refund_mention",
      "orcamento_de_ia",
    ]) {
      expect(MOTIVO_DA_PASSAGEM[motivo], motivo).toBeTruthy();
    }
  });
});

describe("lerLinhas — páginas paralelas com o total já conhecido", () => {
  const banco = Array.from({ length: 2_350 }, (_, i) => i);
  const pedir = (de: number, ate: number) =>
    Promise.resolve({ data: banco.slice(de, ate + 1), error: null });

  it("lê tudo em faixas de mil, na ordem", async () => {
    const { linhas, parcial } = await lerLinhas(pedir, banco.length);
    expect(linhas).toEqual(banco);
    expect(parcial).toBe(false);
  });

  it("instalação com max_rows menor que mil: a série sai marcada parcial", async () => {
    const curto = (de: number, ate: number) =>
      Promise.resolve({ data: banco.slice(de, Math.min(ate + 1, de + 500)), error: null });
    const { parcial } = await lerLinhas(curto, banco.length);
    expect(parcial).toBe(true);
  });

  it("erro do banco sobe — o bloco inteiro vira 'não carregou', nunca zero", async () => {
    const quebrado = () => Promise.resolve({ data: null, error: { message: "boom" } });
    await expect(lerLinhas(quebrado, 10)).rejects.toThrow("boom");
  });
});
