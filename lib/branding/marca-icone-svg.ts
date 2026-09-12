/**
 * O desenho do selo padrão do produto — uma seta ascendente (o "up" +
 * "flow" da marca), como par de paths SVG.
 *
 * Mora fora de `app/icon.tsx` pelo mesmo motivo de `icone.ts`: o loader de
 * metadata do Next re-exporta todo named export de um arquivo de rota
 * gerado, então uma constante exportada dali viraria export de rota inválido.
 * Aqui é dado puro, consumido nos três lugares que desenham o selo — favicon
 * (`app/icon.tsx`), cartão de compartilhamento (`app/opengraph-image.tsx`) e
 * o selo circular da nav pública (`app/_components/LandingNav.tsx`) — um
 * desenho só, sem duplicar o path à mão em cada arquivo.
 *
 * Ao contrário da letra de `icone.ts`, este selo NÃO deriva do nome da
 * instalação — é a mesma seta em qualquer marca, e por isso não carrega
 * risco de white-label (não mostra a letra de ninguém). Quem quiser um selo
 * próprio continua sobrepondo via `logo_path`/`logo_url` na tela de marca.
 */
export const SELO_SETA_VIEWBOX = "0 0 52 52";
export const SELO_SETA_PATHS = ["M10 34 L21 23 L29 31 L41 13", "M31 13 H41 V23"] as const;
