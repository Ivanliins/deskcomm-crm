import { describe, expect, it } from "vitest";

import { contarPorBalde, indiceDoBalde, janelasDoPeriodo, lerPeriodo } from "./periodo";

const SP = "America/Sao_Paulo";
// 09/10/2026, 15:20 em São Paulo (UTC−3).
const AGORA = new Date("2026-10-09T18:20:00.000Z");

describe("lerPeriodo", () => {
  it("aceita os três períodos e cai no padrão para o resto", () => {
    expect(lerPeriodo("hoje")).toBe("hoje");
    expect(lerPeriodo("30d")).toBe("30d");
    expect(lerPeriodo(undefined)).toBe("7d");
    expect(lerPeriodo("90d")).toBe("7d");
    expect(lerPeriodo(["hoje"])).toBe("7d");
  });
});

describe("janelasDoPeriodo", () => {
  it("hoje: da meia-noite LOCAL até agora, um balde por hora, e o ontem do mesmo tamanho", () => {
    const j = janelasDoPeriodo("hoje", AGORA, SP);
    expect(j.granularidade).toBe("hora");
    expect(j.atual.de.toISOString()).toBe("2026-10-09T03:00:00.000Z");
    expect(j.atual.ate).toEqual(AGORA);
    // 00h..15h = 16 baldes, o último fechando em "agora".
    expect(j.baldes).toHaveLength(16);
    expect(j.baldes[0]!.chave).toBe("2026-10-09T00");
    expect(j.baldes[15]!.chave).toBe("2026-10-09T15");
    expect(j.baldes[15]!.ate).toEqual(AGORA);
    // Ontem das 0h às 15h20 — não o dia inteiro, nem as 15h20 que vieram antes de agora.
    expect(j.anterior.de.toISOString()).toBe("2026-10-08T03:00:00.000Z");
    expect(j.anterior.ate.toISOString()).toBe("2026-10-08T18:20:00.000Z");
    expect(j.anterior.ate.getTime() - j.anterior.de.getTime()).toBe(
      AGORA.getTime() - j.atual.de.getTime(),
    );
  });

  it("7 dias: hoje mais os seis anteriores, em dias civis do fuso", () => {
    const j = janelasDoPeriodo("7d", AGORA, SP);
    expect(j.granularidade).toBe("dia");
    expect(j.baldes.map((b) => b.chave)).toEqual([
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]);
    expect(j.atual.de.toISOString()).toBe("2026-10-03T03:00:00.000Z");
    // Os sete dias antes disso, também até as 15h20 do último.
    expect(j.anterior.de.toISOString()).toBe("2026-09-26T03:00:00.000Z");
    expect(j.anterior.ate.toISOString()).toBe("2026-10-02T18:20:00.000Z");
    // Os baldes são contíguos: o fim de um é o começo do próximo.
    for (let i = 1; i < j.baldes.length; i++) {
      expect(j.baldes[i]!.de).toEqual(j.baldes[i - 1]!.ate);
    }
  });

  it("30 dias atravessa a virada do mês sem pular nem repetir dia", () => {
    const j = janelasDoPeriodo("30d", AGORA, SP);
    expect(j.baldes).toHaveLength(30);
    expect(j.baldes[0]!.chave).toBe("2026-09-10");
    expect(j.baldes.map((b) => b.chave)).toContain("2026-09-30");
    expect(j.baldes.map((b) => b.chave)).toContain("2026-10-01");
    expect(new Set(j.baldes.map((b) => b.chave)).size).toBe(30);
  });

  it("o dia é o do fuso: 23h em São Paulo ainda é o mesmo dia, mesmo já sendo amanhã em UTC", () => {
    const noite = new Date("2026-10-10T02:00:00.000Z"); // 09/10 23h em SP
    const j = janelasDoPeriodo("hoje", noite, SP);
    expect(j.baldes[0]!.chave).toBe("2026-10-09T00");
    expect(j.baldes).toHaveLength(24);
  });
});

describe("contar por balde", () => {
  const { baldes } = janelasDoPeriodo("7d", AGORA, SP);

  it("cada instante cai no seu dia local; o que está fora da janela é ignorado", () => {
    const contagem = contarPorBalde(
      [
        "2026-10-03T03:00:00.000Z", // primeiro instante do primeiro dia
        "2026-10-04T02:59:59.999Z", // último instante do primeiro dia
        "2026-10-09T18:19:00.000Z", // hoje
        "2026-10-03T02:59:59.999Z", // um ms antes da janela
        "2026-10-09T18:20:00.000Z", // exatamente "agora": fim exclusivo
        null,
      ],
      baldes,
    );
    expect(contagem).toEqual([2, 0, 0, 0, 0, 0, 1]);
  });

  it("indiceDoBalde devolve -1 fora da janela", () => {
    expect(indiceDoBalde(new Date("2020-01-01T00:00:00Z"), baldes)).toBe(-1);
    expect(indiceDoBalde(new Date("2026-10-06T15:00:00Z"), baldes)).toBe(3);
  });
});
