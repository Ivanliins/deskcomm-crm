import { ImageResponse } from "next/og";

import { SELO_SETA_PATHS, SELO_SETA_VIEWBOX } from "@/lib/branding/marca-icone-svg";
import { marcaDaSaida } from "@/lib/branding/saida";

/**
 * O cartão de compartilhamento (WhatsApp, Slack, X, LinkedIn), DESENHADO em
 * runtime com a marca da instalação — mesmo motivo e mesmo desenho de
 * `app/icon.tsx`: uma imagem estática em `public/` entregaria a marca de
 * QUEM BUILDOU a imagem Docker (nós) para todo revendedor que a roda, porque a
 * imagem é UMA SÓ para todas as instalações. Gerado, cada clone compartilha
 * com a própria marca sem precisar de asset nenhum.
 *
 * `marcaDaSaida()` e não `logo_url`: mesma razão do ícone — campo livre, sem
 * CHECK de host, e buscá-lo aqui seria uma requisição de saída disparada por
 * todo crawler de link preview, com a URL vindo de um campo que o operador
 * digita. Cor + selo (`lib/branding/marca-icone-svg.ts`) + nome não toca a
 * rede.
 *
 * `force-dynamic` pela mesma razão do ícone: sem isto o `next build` congela
 * a imagem dentro da imagem Docker pré-buildada, com a marca de quem buildou
 * — invisível em dev/CI/Vercel, só aparece na VPS do revendedor.
 *
 * Precisa de entrada própria em `PUBLIC_PATHS` (`lib/auth/public-paths.ts`):
 * o matcher do proxy só dispensa caminho COM extensão, e `/opengraph-image`
 * não tem — sem a entrada, todo crawler de preview recebe 307 para `/login`
 * em vez da imagem.
 */

export const dynamic = "force-dynamic";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const marca = await marcaDaSaida(null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#ffffff",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 88,
            height: 88,
            borderRadius: 20,
            background: marca.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={48} height={48} viewBox={SELO_SETA_VIEWBOX} fill="none">
            {SELO_SETA_PATHS.map((d) => (
              <path key={d} d={d} stroke={marca.accentFg} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 56,
            fontWeight: 700,
            color: "#000000",
            letterSpacing: "-0.02em",
          }}
        >
          {marca.nome}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 30,
            color: "rgba(0, 0, 0, 0.62)",
          }}
        >
          CRM com agentes de IA no WhatsApp
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        // Mesmo par TTL do ícone: o operador que troca a marca vê o preview
        // acompanhar dentro de um minuto, sem virar um satori por navegação.
        "cache-control": "public, max-age=60, stale-while-revalidate=600",
      },
    },
  );
}
