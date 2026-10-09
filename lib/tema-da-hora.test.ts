import { describe, expect, it } from "vitest";

import { HORA_QUE_CLAREIA, HORA_QUE_ESCURECE, msAteAProximaVirada, temaDaHora } from "./tema-da-hora";

/** Um instante no relógio LOCAL de quem roda o teste — é o relógio que a regra lê. */
const as = (hora: number, minuto = 0, segundo = 0) => new Date(2026, 9, 9, hora, minuto, segundo);

describe("tema pela hora do dia", () => {
  it("é claro das 6h às 17h59 e escuro fora disso", () => {
    expect(temaDaHora(as(HORA_QUE_CLAREIA - 1, 59, 59))).toBe("dark");
    expect(temaDaHora(as(HORA_QUE_CLAREIA))).toBe("light");
    expect(temaDaHora(as(12))).toBe("light");
    expect(temaDaHora(as(HORA_QUE_ESCURECE - 1, 59, 59))).toBe("light");
    expect(temaDaHora(as(HORA_QUE_ESCURECE))).toBe("dark");
    expect(temaDaHora(as(23, 30))).toBe("dark");
    expect(temaDaHora(as(0))).toBe("dark");
  });

  it("a próxima virada é a das 6h, a das 18h ou a das 6h do dia seguinte", () => {
    expect(msAteAProximaVirada(as(5, 0))).toBe(60 * 60 * 1000);
    expect(msAteAProximaVirada(as(17, 30))).toBe(30 * 60 * 1000);
    expect(msAteAProximaVirada(as(22, 0))).toBe(8 * 60 * 60 * 1000);
  });

  it("nunca devolve menos de um segundo — temporizador adiantado não vira laço", () => {
    expect(msAteAProximaVirada(new Date(2026, 9, 9, 17, 59, 59, 999))).toBe(1_000);
  });

  it("o script anti-flash do layout lê as MESMAS constantes", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const layout = readFileSync(join(__dirname, "..", "app", "layout.tsx"), "utf8");
    // Se alguém trocar a regra por números escritos à mão, o cliente e o script
    // passam a discordar e a tela pisca na hidratação nas viradas.
    expect(layout).toContain("h>=${HORA_QUE_CLAREIA}&&h<${HORA_QUE_ESCURECE}");
  });
});
