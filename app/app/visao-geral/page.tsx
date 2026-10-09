import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";
import { FUSO_PADRAO, fusoValido } from "@/lib/tempo/fusos";
import { carregarVisaoGeral } from "@/lib/visao-geral/carregar";
import { lerPeriodo } from "@/lib/visao-geral/periodo";

import { VisaoGeral } from "./_components/VisaoGeral";

export const dynamic = "force-dynamic";

/**
 * Visão geral — o resumo do período e as duas filas que pedem ação.
 *
 * Leitura no SERVIDOR, com o client de sessão (`lib/visao-geral/carregar.ts`
 * explica por que nunca o admin): a tela chega pintada com os números, e o
 * cliente só os relê de minuto em minuto com `router.refresh()`.
 */
export default async function VisaoGeralPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const { periodo: bruto } = await searchParams;
  const periodo = lerPeriodo(bruto);
  // O dia do gráfico é o dia de quem olha: o fuso do perfil, e o padrão do
  // produto enquanto a pessoa não escolheu um.
  const fuso = user.timezone && fusoValido(user.timezone) ? user.timezone : FUSO_PADRAO;
  const t = (texto: string) => traduzir(texto, user.idioma);

  const db = await createClient();
  const dados = await carregarVisaoGeral(db, { orgId: activeOrg.orgId, periodo, fuso, t });

  const plataforma = user.is_platform_admin && !user.support;
  const papel = ROLE_RANK[activeOrg.role];

  return (
    <VisaoGeral
      dados={dados}
      nome={user.full_name?.trim().split(/\s+/)[0] || null}
      podeConectar={plataforma || papel >= ROLE_RANK.admin}
      podeConfigurarIa={plataforma || papel >= ROLE_RANK.manager}
    />
  );
}
