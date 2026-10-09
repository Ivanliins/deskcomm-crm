/**
 * A LEITURA DA VISÃO GERAL — tudo que a primeira tela do dono precisa, numa ida.
 *
 * ## Client de SESSÃO, nunca o admin
 *
 * Toda consulta aqui roda com o client do usuário (cookie validado), e é isso
 * que faz a tela respeitar o recorte de cada papel: `conversations`, `messages`
 * e `crm_leads` têm RLS por atendente (migrations 0035/0036), então um `agent`
 * em modo próprio vê os números do que é dele — a mesma garantia de
 * `/api/v1/conversations/counts` e de `fn_attendant_metrics`. O
 * `organization_id` vai escrito em TODA consulta mesmo assim: quem pertence a
 * duas organizações passa na RLS das duas.
 *
 * ## Por que sem função SQL nova
 *
 * Cada número abaixo é uma contagem exata (`count: exact, head: true`) ou uma
 * leitura de poucas colunas com teto. Uma RPC agregadora pouparia idas ao banco,
 * mas pediria migration + baseline + MANIFEST para ler o que as tabelas já
 * respondem — e esta tela não escreve nada.
 *
 * ## Falha de um bloco não derruba a tela
 *
 * Cada bloco é independente: se o funil não carregar, a tela diz "não foi
 * possível carregar o funil" e o resto aparece. Mostrar ZERO no lugar de um erro
 * seria a pior mentira possível num painel — o dono leria "nenhuma venda".
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { orgTemAutomatico } from "@/lib/ai/agents/org-tem-automatico";
import {
  comandoDaConversa,
  comandosDaFila,
  ROTULO_DO_COMANDO,
  ROTULO_DO_MOTIVO,
  type ComandoDoBanco,
} from "@/lib/inbox/comando-da-conversa";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import { logger } from "@/lib/logger";

import {
  MOTIVO_DA_PASSAGEM,
  resumirContato,
  somarVendas,
  taxa,
  variacaoEmPontos,
  variacaoRelativa,
  type LinhaDeVenda,
} from "./montar";
import { lerLinhas, PAGINA } from "./paginas";
import {
  contarPorBalde,
  indiceDoBalde,
  janelasDoPeriodo,
  type Janela,
  type Periodo,
} from "./periodo";
import type {
  BaldeDaSerie,
  ConversaDaIa,
  ConversaNaFila,
  EtapaDoFunil,
  Indicador,
  LinhaRecente,
  VisaoGeralDados,
} from "./tipos";

type Db = SupabaseClient;

/** "Ao vivo" é o automático no comando de uma conversa que se mexeu nas últimas 24h. */
const JANELA_AO_VIVO_MS = 24 * 60 * 60 * 1000;

export interface ParametrosDaVisaoGeral {
  orgId: string;
  periodo: Periodo;
  fuso: string;
  t: (texto: string) => string;
  agora?: Date;
}

interface ContatoDaLinha {
  display_name: string | null;
  name: string | null;
  phone_number: string | null;
  force_human?: boolean | null;
  is_blocked?: boolean | null;
}

/** O PostgREST devolve o embed como objeto; versões antigas do client tipam como lista. */
function um<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

async function contar(consulta: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> {
  const { count, error } = await consulta;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

const iso = (d: Date) => d.toISOString();

export async function carregarVisaoGeral(
  db: Db,
  { orgId, periodo, fuso, t, agora = new Date() }: ParametrosDaVisaoGeral,
): Promise<VisaoGeralDados> {
  const janelas = janelasDoPeriodo(periodo, agora, fuso);
  const { atual, anterior, baldes } = janelas;
  const falhas: string[] = [];

  /** Roda um bloco; se ele falhar, registra e devolve o substituto — a tela segue. */
  async function bloco<T>(nome: string, fn: () => Promise<T>, substituto: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      falhas.push(nome);
      logger.warn("[visao-geral] bloco não carregou", {
        bloco: nome,
        organization_id: orgId,
        erro: err instanceof Error ? err.message : String(err),
      });
      return substituto;
    }
  }

  const contagem = (tabela: string) =>
    db.from(tabela).select("id", { count: "exact", head: true }).eq("organization_id", orgId);

  const demandasEm = (j: Janela) =>
    contagem("demandas").gte("aberta_em", iso(j.de)).lt("aberta_em", iso(j.ate));
  const respostasEm = (j: Janela, via: readonly string[]) =>
    contagem("messages")
      .eq("direction", "outbound")
      .in("sent_via", via as string[])
      .gte("sent_at", iso(j.de))
      .lt("sent_at", iso(j.ate));
  const leadsEm = (j: Janela) =>
    contagem("crm_leads").gte("created_at", iso(j.de)).lt("created_at", iso(j.ate));
  const ganhosEm = (j: Janela) =>
    db
      .from("crm_leads")
      .select("value_cents, currency, closed_at")
      .eq("organization_id", orgId)
      .eq("status", "won")
      .gte("closed_at", iso(j.de))
      .lt("closed_at", iso(j.ate))
      .order("closed_at", { ascending: false })
      .range(0, PAGINA - 1);

  const VIA_IA = ["ai"] as const;
  // `user` = respondeu pelo sistema; `external_device` = pelo celular da loja.
  // Os dois são gente — é a mesma divisão de `fn_atrito_metrics` (envios).
  const VIA_EQUIPE = ["user", "external_device"] as const;

  const automaticoDaOrg = await orgTemAutomatico(db, orgId);

  const [numeros, vendas, fila, ia, recentes, funil, canais] = await Promise.all([
    // ── Os números do período (contagens exatas) ─────────────────────────────
    bloco(
      "numeros",
      async () => {
        const [atd, atdAnt, ia, iaAnt, eq, eqAnt, leads, leadsAnt] = await Promise.all([
          contar(demandasEm(atual)),
          contar(demandasEm(anterior)),
          contar(respostasEm(atual, VIA_IA)),
          contar(respostasEm(anterior, VIA_IA)),
          contar(respostasEm(atual, VIA_EQUIPE)),
          contar(respostasEm(anterior, VIA_EQUIPE)),
          contar(leadsEm(atual)),
          contar(leadsEm(anterior)),
        ]);
        return { atd, atdAnt, ia, iaAnt, eq, eqAnt, leads, leadsAnt };
      },
      null,
    ),
    // ── Vendas: negócios GANHOS no período, somados numa moeda ───────────────
    bloco(
      "vendas",
      async () => {
        const [agoraR, antesR] = await Promise.all([ganhosEm(atual), ganhosEm(anterior)]);
        if (agoraR.error) throw new Error(agoraR.error.message);
        if (antesR.error) throw new Error(antesR.error.message);
        const linhas = (agoraR.data ?? []) as Array<LinhaDeVenda & { closed_at: string | null }>;
        const soma = somarVendas(linhas);
        const somaAnterior = somarVendas((antesR.data ?? []) as LinhaDeVenda[], soma.moeda);
        const porBalde = baldes.map(() => 0);
        for (const l of linhas) {
          if ((l.currency ?? "BRL").toUpperCase() !== soma.moeda || !l.closed_at) continue;
          const i = indiceDoBalde(new Date(l.closed_at), baldes);
          if (i >= 0) porBalde[i]! += l.value_cents ?? 0;
        }
        return { soma, somaAnterior, porBalde };
      },
      null,
    ),
    // ── Quem espera por uma pessoa (o mesmo predicado da aba Fila) ───────────
    bloco(
      "fila",
      async () => {
        const comandos = comandosDaFila(automaticoDaOrg);
        const [total, itens] = await Promise.all([
          contar(contagem("conversations").in("comando_da_conversa", comandos)),
          db
            .from("conversations")
            .select(
              "id, status, assigned_to_user_id, bot_silenced_until, last_inbound_at, last_handoff_reason, contacts:contact_id (display_name, name, phone_number, force_human, is_blocked)",
            )
            .eq("organization_id", orgId)
            .in("comando_da_conversa", comandos)
            .order("last_inbound_at", { ascending: true, nullsFirst: false })
            .limit(4),
        ]);
        if (itens.error) throw new Error(itens.error.message);
        const linhas = (itens.data ?? []) as unknown as Array<{
          id: string;
          status: string;
          assigned_to_user_id: string | null;
          bot_silenced_until: string | null;
          last_inbound_at: string | null;
          last_handoff_reason: string | null;
          contacts: ContatoDaLinha | ContatoDaLinha[] | null;
        }>;
        return {
          total,
          itens: linhas.map((c): ConversaNaFila => {
            const contato = um(c.contacts);
            return {
              id: c.id,
              contato: resumirContato(contato, t),
              desde: c.last_inbound_at,
              motivo: motivoDaEspera(c, contato, automaticoDaOrg),
            };
          }),
        };
      },
      { total: 0, itens: [] as ConversaNaFila[] },
    ),
    // ── O que a IA está atendendo agora ───────────────────────────────────────
    bloco(
      "ia",
      async () => {
        if (automaticoDaOrg === false) return { total: 0, itens: [] as ConversaDaIa[] };
        const desde = iso(new Date(agora.getTime() - JANELA_AO_VIVO_MS));
        const [total, itens] = await Promise.all([
          contar(
            contagem("conversations")
              .eq("comando_da_conversa", "automatico")
              .gte("last_message_at", desde),
          ),
          db
            .from("conversations")
            .select(
              "id, last_message_at, last_inbound_at, last_outbound_at, last_message_preview, contacts:contact_id (display_name, name, phone_number)",
            )
            .eq("organization_id", orgId)
            .eq("comando_da_conversa", "automatico")
            .gte("last_message_at", desde)
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(5),
        ]);
        if (itens.error) throw new Error(itens.error.message);
        const linhas = (itens.data ?? []) as unknown as Array<{
          id: string;
          last_message_at: string | null;
          last_inbound_at: string | null;
          last_outbound_at: string | null;
          last_message_preview: string | null;
          contacts: ContatoDaLinha | ContatoDaLinha[] | null;
        }>;
        return {
          total,
          itens: linhas.map(
            (c): ConversaDaIa => ({
              id: c.id,
              contato: resumirContato(um(c.contacts), t),
              quando: c.last_message_at,
              previa: c.last_message_preview,
              ultimo:
                c.last_inbound_at &&
                (!c.last_outbound_at || c.last_inbound_at > c.last_outbound_at)
                  ? "cliente"
                  : "ia",
            }),
          ),
        };
      },
      { total: 0, itens: [] as ConversaDaIa[] },
    ),
    // ── As últimas conversas, com a etapa e o valor do negócio do contato ────
    bloco("recentes", () => lerRecentes(db, orgId, automaticoDaOrg, t), [] as LinhaRecente[]),
    // ── O funil padrão: quem está em cada etapa, e quem fechou no período ────
    bloco("funil", () => lerFunil(db, orgId, atual), null),
    // ── Há WhatsApp conectado? (decide o convite da primeira vez) ────────────
    bloco(
      "canais",
      async () => {
        const [total, conectados] = await Promise.all([
          contar(contagem("channel_sessions").is("archived_at", null)),
          contar(contagem("channel_sessions").is("archived_at", null).eq("status", "WORKING")),
        ]);
        return { total, conectados };
      },
      { total: 0, conectados: 0 },
    ),
  ]);

  // ── As séries: lidas DEPOIS das contagens, que dizem quantas linhas esperar ──
  const series = await bloco(
    "serie",
    async () => {
      if (!numeros) throw new Error("sem contagens para dimensionar a série");
      const [msgs, dems, lds] = await Promise.all([
        lerLinhas<{ sent_at: string; sent_via: string }>(
          (de, ate) =>
            db
              .from("messages")
              .select("sent_at, sent_via")
              .eq("organization_id", orgId)
              .eq("direction", "outbound")
              .in("sent_via", [...VIA_IA, ...VIA_EQUIPE])
              .gte("sent_at", iso(atual.de))
              .lt("sent_at", iso(atual.ate))
              .order("sent_at", { ascending: false })
              .order("id", { ascending: false })
              .range(de, ate),
          numeros.ia + numeros.eq,
        ),
        lerLinhas<{ aberta_em: string }>(
          (de, ate) =>
            db
              .from("demandas")
              .select("aberta_em")
              .eq("organization_id", orgId)
              .gte("aberta_em", iso(atual.de))
              .lt("aberta_em", iso(atual.ate))
              .order("aberta_em", { ascending: false })
              .order("id", { ascending: false })
              .range(de, ate),
          numeros.atd,
        ),
        lerLinhas<{ created_at: string }>(
          (de, ate) =>
            db
              .from("crm_leads")
              .select("created_at")
              .eq("organization_id", orgId)
              .gte("created_at", iso(atual.de))
              .lt("created_at", iso(atual.ate))
              .order("created_at", { ascending: false })
              .order("id", { ascending: false })
              .range(de, ate),
          numeros.leads,
        ),
      ]);
      const ia = contarPorBalde(
        msgs.linhas.filter((m) => m.sent_via === "ai").map((m) => m.sent_at),
        baldes,
      );
      const equipe = contarPorBalde(
        msgs.linhas.filter((m) => m.sent_via !== "ai").map((m) => m.sent_at),
        baldes,
      );
      return {
        ia,
        equipe,
        atendimentos: contarPorBalde(
          dems.linhas.map((d) => d.aberta_em),
          baldes,
        ),
        leads: contarPorBalde(
          lds.linhas.map((l) => l.created_at),
          baldes,
        ),
        parcial: msgs.parcial || dems.parcial || lds.parcial,
      };
    },
    null,
  );

  const taxaIa = numeros ? taxa(numeros.ia, numeros.ia + numeros.eq) : null;
  const taxaIaAnterior = numeros ? taxa(numeros.iaAnt, numeros.iaAnt + numeros.eqAnt) : null;

  const indicadores: Indicador[] = [
    {
      id: "atendimentos",
      valor: numeros?.atd ?? null,
      formato: "inteiro",
      variacao: numeros ? variacaoRelativa(numeros.atd, numeros.atdAnt) : null,
      subirEhBom: true,
      serie: series?.atendimentos ?? null,
    },
    {
      id: "respostas_ia",
      valor: taxaIa,
      formato: "percentual",
      variacao: variacaoEmPontos(taxaIa, taxaIaAnterior),
      subirEhBom: true,
      serie: series
        ? series.ia.map((n, i) => {
            const total = n + (series.equipe[i] ?? 0);
            return total > 0 ? n / total : 0;
          })
        : null,
      apoio: numeros ? numeros.ia : undefined,
    },
    {
      id: "vendas",
      valor: vendas ? vendas.soma.centavos : null,
      formato: "moeda",
      moeda: vendas?.soma.moeda ?? "BRL",
      variacao: vendas ? variacaoRelativa(vendas.soma.centavos, vendas.somaAnterior.centavos) : null,
      subirEhBom: true,
      serie: vendas?.porBalde ?? null,
      apoio: vendas?.soma.quantidade,
    },
    {
      id: "leads",
      valor: numeros?.leads ?? null,
      formato: "inteiro",
      variacao: numeros ? variacaoRelativa(numeros.leads, numeros.leadsAnt) : null,
      subirEhBom: true,
      serie: series?.leads ?? null,
    },
    {
      id: "aguardando",
      valor: falhas.includes("fila") ? null : fila.total,
      formato: "inteiro",
      variacao: null,
      subirEhBom: false,
      serie: null,
    },
  ];

  const serieDoGrafico: BaldeDaSerie[] = baldes.map((b, i) => ({
    chave: b.chave,
    de: iso(b.de),
    ate: iso(b.ate),
    ia: series?.ia[i] ?? 0,
    equipe: series?.equipe[i] ?? 0,
  }));

  return {
    geradoEm: iso(agora),
    periodo,
    granularidade: janelas.granularidade,
    fuso,
    indicadores,
    serie: { baldes: serieDoGrafico, parcial: series?.parcial ?? false },
    funil,
    fila,
    ia: {
      noAr: automaticoDaOrg ?? null,
      total: ia.total,
      itens: ia.itens,
    },
    recentes,
    canais,
    falhas,
  };
}

/** O motivo da espera, como chave de `t()` — do mais específico ao genérico. */
function motivoDaEspera(
  c: { status: string; assigned_to_user_id: string | null; bot_silenced_until: string | null; last_handoff_reason: string | null },
  contato: ContatoDaLinha | null,
  automaticoDaOrg: boolean | undefined,
): string {
  const daPassagem = c.last_handoff_reason ? MOTIVO_DA_PASSAGEM[c.last_handoff_reason] : undefined;
  if (daPassagem) return daPassagem;
  const comando = comandoDaConversa({
    status: c.status,
    automaticoDaOrg,
    assigned_to_user_id: c.assigned_to_user_id,
    bot_silenced_until: c.bot_silenced_until,
    force_human: contato?.force_human ?? false,
    is_blocked: contato?.is_blocked ?? false,
  });
  if (comando.motivo) return ROTULO_DO_MOTIVO[comando.motivo];
  return ROTULO_DO_COMANDO[comando.comando.quem];
}

async function lerRecentes(
  db: Db,
  orgId: string,
  automaticoDaOrg: boolean | undefined,
  t: (texto: string) => string,
): Promise<LinhaRecente[]> {
  const { data, error } = await db
    .from("conversations")
    .select(
      "id, last_message_at, assigned_to_user_name, comando_da_conversa, contact_id, contacts:contact_id (display_name, name, phone_number), channel_sessions:channel_session_id (display_name, phone_number)",
    )
    .eq("organization_id", orgId)
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  const conversas = (data ?? []) as unknown as Array<{
    id: string;
    last_message_at: string | null;
    assigned_to_user_name: string | null;
    comando_da_conversa: ComandoDoBanco | null;
    contact_id: string | null;
    contacts: ContatoDaLinha | ContatoDaLinha[] | null;
    channel_sessions:
      | { display_name: string | null; phone_number: string | null }
      | Array<{ display_name: string | null; phone_number: string | null }>
      | null;
  }>;

  // O negócio de cada contato: o ABERTO mais recente; sem aberto, o último que
  // se mexeu. Uma consulta para as oito linhas, não oito consultas.
  const contatos = [...new Set(conversas.map((c) => c.contact_id).filter((id): id is string => !!id))];
  const negocioDoContato = new Map<
    string,
    { etapa: string | null; valorCentavos: number | null; moeda: string | null; aberto: boolean }
  >();
  if (contatos.length > 0) {
    const leads = await db
      .from("crm_leads")
      .select("contact_id, value_cents, currency, status, updated_at, etapa:stage_id (name)")
      .eq("organization_id", orgId)
      .in("contact_id", contatos)
      .order("updated_at", { ascending: false })
      .limit(80);
    if (leads.error) throw new Error(leads.error.message);
    for (const l of (leads.data ?? []) as unknown as Array<{
      contact_id: string;
      value_cents: number | null;
      currency: string | null;
      status: string;
      etapa: { name: string | null } | Array<{ name: string | null }> | null;
    }>) {
      const atual = negocioDoContato.get(l.contact_id);
      const aberto = l.status === "open";
      // A lista vem do mais recente para o mais antigo: o primeiro fica, a não
      // ser que um ABERTO apareça depois de um fechado.
      if (atual && (atual.aberto || !aberto)) continue;
      negocioDoContato.set(l.contact_id, {
        etapa: um(l.etapa)?.name ?? null,
        valorCentavos: l.value_cents,
        moeda: l.currency ?? "BRL",
        aberto,
      });
    }
  }

  return conversas.map((c): LinhaRecente => {
    const canal = um(c.channel_sessions);
    const negocio = c.contact_id ? negocioDoContato.get(c.contact_id) : undefined;
    const comando: LinhaRecente["comando"] =
      c.comando_da_conversa === "automatico" && automaticoDaOrg === false
        ? "ninguem"
        : (c.comando_da_conversa ?? "automatico");
    return {
      id: c.id,
      contato: resumirContato(um(c.contacts), t),
      quando: c.last_message_at,
      canal: canal?.display_name?.trim() || (canal?.phone_number ? phoneForDisplay(canal.phone_number) : null),
      comando,
      atendente: comando === "humano" ? c.assigned_to_user_name : null,
      etapa: negocio?.etapa ?? null,
      valorCentavos: negocio?.valorCentavos ?? null,
      moeda: negocio?.moeda ?? null,
    };
  });
}

async function lerFunil(
  db: Db,
  orgId: string,
  atual: Janela,
): Promise<{ nome: string; etapas: EtapaDoFunil[] } | null> {
  // O funil PADRÃO da organização; sem padrão marcado, o primeiro da lista —
  // a mesma escolha de quem abre "Funis".
  const { data: funis, error } = await db
    .from("crm_pipelines")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_archived", false)
    .order("is_default", { ascending: false })
    .order("position", { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  const funil = (funis ?? [])[0] as { id: string; name: string } | undefined;
  if (!funil) return null;

  const { data: etapas, error: erroEtapas } = await db
    .from("crm_stages")
    .select("id, name, position, is_won, is_lost")
    .eq("organization_id", orgId)
    .eq("pipeline_id", funil.id)
    .eq("is_archived", false)
    .order("position", { ascending: true });
  if (erroEtapas) throw new Error(erroEtapas.message);

  // Etapa de PERDA fica fora: um funil de vendas mostra o caminho até a venda.
  // Quem quer ver perda abre Desempenho, que conta ganho e perdido por pessoa.
  const visiveis = ((etapas ?? []) as Array<{
    id: string;
    name: string;
    is_won: boolean;
    is_lost: boolean;
  }>).filter((e) => !e.is_lost);

  const quantidades = await Promise.all(
    visiveis.map((e) => {
      const base = db
        .from("crm_leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("stage_id", e.id);
      // Etapa de ganho conta quem FECHOU no período — parado nela não há
      // ninguém, porque ganhar tira o negócio de "aberto".
      return contar(
        e.is_won
          ? base.eq("status", "won").gte("closed_at", iso(atual.de)).lt("closed_at", iso(atual.ate))
          : base.eq("status", "open"),
      );
    }),
  );

  return {
    nome: funil.name,
    etapas: visiveis.map((e, i) => ({
      id: e.id,
      nome: e.name,
      quantidade: quantidades[i] ?? 0,
      ganha: e.is_won,
    })),
  };
}

