/**
 * Leitura em páginas para as séries da Visão geral.
 *
 * Mora fora de `carregar.ts` para ser testável sem banco nem ambiente: é aqui
 * que mora a única conta não trivial da leitura (as faixas de cada página e a
 * detecção de leitura incompleta).
 */

/** O que o PostgREST devolve por página (o `max_rows` padrão do Supabase). */
export const PAGINA = 1_000;
/**
 * Teto de linhas lidas por série. Os TOTAIS não dependem dele — saem de
 * contagens exatas —, só o desenho dia a dia. Acima disto a série é marcada
 * `parcial` e a tela avisa, em vez de desenhar barras baixas que não aconteceram.
 */
export const TETO_DA_SERIE = 10_000;

export interface Resposta<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Lê até `esperado` linhas (limitado ao teto), em páginas paralelas — o total
 * já é conhecido pela contagem exata, então as faixas saem de antemão.
 *
 * Página que volta mais curta do que pediu sem ser a última quer dizer que o
 * `max_rows` da instalação é menor que o nosso — a série fica marcada parcial
 * em vez de fingir que leu tudo. Exportada para ser testável sem banco.
 */
export async function lerLinhas<T>(
  pedir: (de: number, ate: number) => PromiseLike<Resposta<T>>,
  esperado: number,
): Promise<{ linhas: T[]; parcial: boolean }> {
  const alvo = Math.min(esperado, TETO_DA_SERIE);
  const faixas: Array<[number, number]> = [];
  for (let de = 0; de < alvo; de += PAGINA) faixas.push([de, Math.min(de + PAGINA, alvo) - 1]);
  const paginas = await Promise.all(faixas.map(([de, ate]) => pedir(de, ate)));
  const linhas: T[] = [];
  let curta = false;
  paginas.forEach((p, i) => {
    if (p.error) throw new Error(p.error.message);
    const dados = p.data ?? [];
    const [de, ate] = faixas[i]!;
    if (i < faixas.length - 1 && dados.length < ate - de + 1) curta = true;
    linhas.push(...dados);
  });
  return { linhas, parcial: esperado > TETO_DA_SERIE || curta };
}
