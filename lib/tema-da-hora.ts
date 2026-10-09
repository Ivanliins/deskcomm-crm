/**
 * O TEMA PELA HORA DO DIA — claro enquanto é dia, escuro quando escurece.
 *
 * É o padrão de quem nunca escolheu um tema (`"auto"` em `lib/theme.tsx`). A
 * escolha explícita de claro, escuro ou "sistema" continua valendo por cima
 * dele, gravada no mesmo `localStorage` de sempre.
 *
 * ## Por que relógio, e não nascer/pôr do sol
 *
 * O horário solar pediria a localização de quem usa — permissão do navegador,
 * ou um palpite pelo fuso que erra por uma hora dentro do mesmo país. O relógio
 * é o que a pessoa já tem na tela, e a regra cabe numa frase que ela consegue
 * conferir sozinha: das 6h às 18h é claro, fora disso é escuro.
 *
 * ## Por que o relógio do NAVEGADOR
 *
 * Quem decide se é dia é o lugar onde a pessoa está, não o fuso do servidor
 * (UTC na Vercel) nem o fuso de apresentação do perfil — este arquivo roda no
 * cliente, e o script anti-flash de `app/layout.tsx` repete a mesma conta antes
 * do primeiro paint. As duas leem estas constantes; não há um segundo par de
 * números para manter em sincronia.
 */

export type TemaResolvido = "light" | "dark";

/** A hora (local, 0–23) em que o tema passa a ser claro. */
export const HORA_QUE_CLAREIA = 6;
/** A hora (local, 0–23) em que o tema passa a ser escuro. */
export const HORA_QUE_ESCURECE = 18;

/** O tema daquele instante, pelo relógio local. */
export function temaDaHora(agora: Date = new Date()): TemaResolvido {
  const hora = agora.getHours();
  return hora >= HORA_QUE_CLAREIA && hora < HORA_QUE_ESCURECE ? "light" : "dark";
}

/**
 * Quanto falta para a próxima virada (6h ou 18h), em milissegundos.
 *
 * O piso de 1 segundo existe para o caso de o temporizador disparar uns
 * milissegundos ANTES da virada — acontece, o navegador não garante pontualidade
 * — e a conta devolver zero: sem o piso, isso viraria um laço apertado até o
 * relógio passar da hora.
 */
export function msAteAProximaVirada(agora: Date = new Date()): number {
  const alvo = new Date(agora.getTime());
  const hora = agora.getHours();
  if (hora < HORA_QUE_CLAREIA) {
    alvo.setHours(HORA_QUE_CLAREIA, 0, 0, 0);
  } else if (hora < HORA_QUE_ESCURECE) {
    alvo.setHours(HORA_QUE_ESCURECE, 0, 0, 0);
  } else {
    alvo.setDate(alvo.getDate() + 1);
    alvo.setHours(HORA_QUE_CLAREIA, 0, 0, 0);
  }
  return Math.max(1_000, alvo.getTime() - agora.getTime());
}
