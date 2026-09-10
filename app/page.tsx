import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CaretDown, Check, Robot, ShieldCheck, Table } from "@phosphor-icons/react/ssr";

import { marcaDaInstalacaoResolvida } from "@/lib/branding/instalacao";
import { loadAuthUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { LandingNav } from "./_components/LandingNav";
import { Reveal } from "./_components/Reveal";
import { TaglineReveal } from "./_components/TaglineReveal";
import styles from "./page.module.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * A raiz deixa de ser um redirect puro. Visitante ANÔNIMO vê a landing page
 * comercial (este arquivo); visitante AUTENTICADO continua indo direto para
 * `/app`, exatamente como antes — `loadAuthUser()` é o helper que NÃO lança
 * nem redireciona sozinho (diferente de `requireAuth()`), então esta página
 * pode decidir os dois caminhos.
 *
 * Metadata local sobrescreve o `robots: {index:false}` do layout raiz — aquela
 * regra existe para o APP autenticado (nunca deve ser indexado); esta página é
 * exatamente o oposto, o único lugar do domínio que QUER ser encontrado.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { marca } = await marcaDaInstalacaoResolvida();
  const { name } = marca;
  const title = `${name} — CRM com IA nativa no WhatsApp`;
  const description = `${name} atende, qualifica e move o funil pelo WhatsApp com agentes de IA — tudo registrado e auditável. Planos sem cobrança por assento.`;
  return {
    // `title.absolute` ignora o `template` do layout raiz ("%s · {name}") — a
    // home NÃO deve virar "{name} — CRM... · {name}", que duplicaria a marca.
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
    // Sem `images`: o Next resolve sozinho pra `app/opengraph-image.tsx`
    // (convenção de arquivo), que já desenha a marca da instalação em runtime.
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

interface PlanoPublico {
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_interval: "monthly" | "yearly";
  max_seats: number | null;
  max_whatsapp_numbers: number | null;
  max_messages_month: number | null;
}

function precoFormatado(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function limiteFormatado(n: number | null, singular: string, plural: string): string {
  if (n === null) return `${plural} ilimitados`;
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? singular : plural}`;
}

/**
 * A vida de uma conversa — GENUINAMENTE sequencial (é o que acontece, em
 * ordem, quando um cliente escreve), por isso ganha trilho numerado. Um card
 * de feature solto não teria essa licença.
 */
const JORNADA = [
  {
    titulo: "A mensagem chega",
    corpo: "O cliente escreve no WhatsApp. Antes de qualquer resposta, o sistema já sabe quem é: histórico, pedidos, o que ficou combinado da última vez.",
  },
  {
    titulo: "O agente lê antes de falar",
    corpo: "Busca na base de conhecimento da sua empresa — prazo, política, catálogo. Não inventa o que não sabe.",
  },
  {
    titulo: "Sete verificações antes de enviar",
    corpo: "Descadastro, LGPD, anti-banimento, promessa determinística e semântica. Nessa ordem, sempre — inclusive o que foi barrado fica registrado.",
  },
  {
    titulo: "Nada fica sem próximo passo",
    corpo: "Qualificado, o lead move de etapa sozinho. Se esfriar, o Radar classifica o risco antes de virar prejuízo.",
  },
] as const;

const FAQ = [
  {
    pergunta: "Quanto custa?",
    resposta:
      "Os planos vão de assinatura de entrada para operações pequenas até planos maiores com mais usuários, números de WhatsApp e volume de mensagens. Todos incluem agentes de IA nativos — veja os valores atualizados na seção de planos acima.",
  },
  {
    pergunta: "Preciso saber programar para usar?",
    resposta: "Não. O cadastro leva minutos e o número de WhatsApp conecta por QR code, sem instalar nada.",
  },
  {
    pergunta: "O que acontece se a IA errar?",
    resposta:
      "Cada mensagem passa por sete verificações antes de sair, e todas ficam registradas — inclusive as que barraram um envio. Quando o agente não deve seguir sozinho, ele passa para um humano com o resumo do que aconteceu.",
  },
  {
    pergunta: "Preciso de cartão de crédito para testar?",
    resposta: "Não. O período de teste começa sem cartão — só é preciso assinar quando decidir continuar.",
  },
  {
    pergunta: "Meus dados ficam seguros?",
    resposta:
      "A plataforma é multi-tenant com isolamento por organização testado a cada mudança, e o produto trata dados pessoais com as práticas de LGPD nativas: exportação, redação e anonimização sob pedido.",
  },
];

/** A ilustração do hero. Estática o bastante para nunca some sem JS/motion — a trilha e os nós contam a história sozinhos; o ponto animado só reforça. */
function IlustracaoDaMesa() {
  return (
    <svg viewBox="0 0 480 320" className="h-auto w-full max-w-[520px]" aria-hidden="true">
      <rect x="16" y="16" width="448" height="288" rx="24" className="fill-surface stroke-border" />

      <path d="M 115 235 C 160 215 190 195 216 175" fill="none" className="stroke-border-strong" strokeWidth={2} />
      <path d="M 280 146 C 310 132 340 120 372 112" fill="none" className="stroke-border-strong" strokeWidth={2} />
      <path
        d="M 274 177 Q 320 200 354 233"
        fill="none"
        className="stroke-border-strong"
        strokeWidth={2}
        strokeDasharray="3 5"
      />

      {/* Conversa */}
      <g>
        <rect x="74" y="224" width="44" height="44" rx="12" className="fill-surface-elevated stroke-border" />
        <path
          d="M 86 240 h20 a4 4 0 0 1 4 4 v6 a4 4 0 0 1 -4 4 h-10 l-6 5 v-5 h-4 a4 4 0 0 1 -4 -4 v-6 a4 4 0 0 1 4 -4 z"
          fill="none"
          className="stroke-text-muted"
          strokeWidth={1.6}
        />
        <text x="96" y="286" textAnchor="middle" className="fill-text-muted font-mono text-[9.5px] font-medium uppercase tracking-wider">
          Conversa
        </text>
      </g>

      {/* Agente de IA */}
      <g>
        <circle cx="246" cy="158" r="34" className="fill-accent" />
        <circle cx="246" cy="158" r="4.5" className="fill-accent-foreground" />
        {[
          [233, 150],
          [259, 150],
          [233, 167],
          [259, 167],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <line x1={246} y1={158} x2={x} y2={y} className="stroke-accent-foreground" strokeWidth={1} opacity={0.6} />
            <circle cx={x} cy={y} r={3} className="fill-accent-foreground" opacity={0.75} />
          </g>
        ))}
        <text x="246" y="210" textAnchor="middle" className="fill-text-muted font-mono text-[9.5px] font-medium uppercase tracking-wider">
          Agente de IA
        </text>
      </g>

      {/* Funil */}
      <g>
        <rect x="350" y="90" width="44" height="44" rx="12" className="fill-surface-elevated stroke-border" />
        <rect x="360" y="100" width="6" height="24" rx="2" className="fill-text-muted" />
        <rect x="369" y="106" width="6" height="18" rx="2" className="fill-text-muted" opacity={0.55} />
        <rect x="378" y="112" width="6" height="12" rx="2" className="fill-text-muted" opacity={0.3} />
        <text x="372" y="152" textAnchor="middle" className="fill-text-muted font-mono text-[9.5px] font-medium uppercase tracking-wider">
          Funil
        </text>
      </g>

      {/* Follow-up */}
      <g>
        <rect x="332" y="211" width="44" height="44" rx="12" className="fill-surface-elevated stroke-border" />
        <circle cx="354" cy="233" r="11" fill="none" className="stroke-text-muted" strokeWidth={1.6} />
        <path d="M 354 226 v7 l5 4" fill="none" className="stroke-text-muted" strokeWidth={1.6} strokeLinecap="round" />
        <text x="354" y="273" textAnchor="middle" className="fill-text-muted font-mono text-[9.5px] font-medium uppercase tracking-wider">
          Follow-up
        </text>
      </g>

      <circle r="5" className={`fill-accent ${styles.lead}`} />
    </svg>
  );
}

export default async function LandingPage() {
  const user = await loadAuthUser();
  if (user) redirect("/app");

  const { marca } = await marcaDaInstalacaoResolvida();
  const { name } = marca;
  const { data: planosData } = await createAdminClient()
    .from("plans")
    .select("slug, name, description, price_cents, currency, billing_interval, max_seats, max_whatsapp_numbers, max_messages_month")
    .eq("is_active", true)
    .order("sort_order");
  const planos = (planosData ?? []) as PlanoPublico[];

  return (
    <div className={`${styles.landing} ${inter.variable} min-h-screen bg-bg text-text`}>
      {/* Sem isto, JS desligado ou que falhe antes de hidratar deixa todo
          conteúdo abaixo do topo em `opacity:0` para sempre — ver page.module.css. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js-reveal')" }} />

      <LandingNav name={name} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-80px] top-[-60px] h-[220px] w-[220px] rounded-full bg-accent-100 opacity-70 blur-2xl sm:right-[-120px] sm:top-[-80px] sm:h-[420px] sm:w-[420px] sm:blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 sm:pb-28 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8">
          <Reveal className="relative max-w-[680px]">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent">
              CRM + agentes de IA no WhatsApp
            </p>
            <h1 className={`mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-balance sm:text-6xl ${styles.heroTitle}`}>
              <span className="block">Sua operação comercial numa mesa só.</span>
              <span className="block">E nada morre em cima dela.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-pretty text-muted-foreground">
              Agentes de IA atendem no WhatsApp, qualificam o lead e movem o funil — com tudo
              registrado e auditável. Sem cobrança por usuário: seu time cresce, o plano não muda.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {["Multi-tenant com RLS", "LGPD nativa desde o dia 1", "Sem cobrança por assento"].map((selo) => (
                <li
                  key={selo}
                  className={`rounded-full px-3 py-1 text-xs font-medium text-text ${styles.glassBadge}`}
                >
                  {selo}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="#precos">Começar teste grátis de 14 dias</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#jornada">Ver como funciona</Link>
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck size={15} weight="bold" className="text-accent" aria-hidden="true" />
              Sem cartão de crédito para testar.
            </p>
          </Reveal>
          <Reveal delay={150} className="relative flex justify-center lg:justify-end">
            <IlustracaoDaMesa />
          </Reveal>
        </div>
      </section>

      {/* Tagline (B11) — o benefício central do produto, isolado como seu
          próprio momento, ativando palavra por palavra ao rolar. */}
      <section className="border-t border-border bg-surface-elevated/40 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <TaglineReveal lines={["Nenhum lead fica sem resposta.", "Nenhuma resposta fica sem registro."]} />
        </div>
      </section>

      {/* Problema */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 className="max-w-lg text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Você não perde venda por falta de lead.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <Reveal delay={80}>
              <div className={`flex h-full flex-col gap-3 rounded-xl border border-border bg-bg p-6 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-accent ${styles.floatShadow}`}>
                <Table size={22} weight="duotone" className="text-accent" aria-hidden="true" />
                <h3 className="font-semibold">O CRM que é planilha bonita</h3>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                  O lead entra, alguém cadastra, e nada acontece. Quando você percebe, ele sumiu — e
                  ninguém sabe dizer em que momento, nem por quê.
                </p>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className={`flex h-full flex-col gap-3 rounded-xl border border-border bg-bg p-6 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-accent ${styles.floatShadow}`}>
                <Robot size={22} weight="duotone" className="text-accent" aria-hidden="true" />
                <h3 className="font-semibold">O robô que responde e some</h3>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                  Atende rápido, responde qualquer coisa, e some. Se prometeu um prazo que não
                  existe, você descobre pelo cliente — sem conseguir auditar o que foi dito.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* A vida de uma conversa — sequência real, por isso leva trilho numerado */}
      <section id="jornada" className="border-t border-border bg-surface-elevated/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="max-w-lg">
            <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">A vida de uma conversa</h2>
            <p className="mt-3 text-pretty text-muted-foreground">O que acontece, em ordem, do primeiro "oi" até o funil se mexer sozinho.</p>
          </Reveal>
          <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {JORNADA.map((etapa, i) => (
              <li key={etapa.titulo}>
                <Reveal delay={i * 90} className="relative border-t-2 border-accent pt-4">
                  <span className="font-mono text-xs font-semibold tabular-nums text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-semibold">{etapa.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">{etapa.corpo}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Planos</h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Sem cobrança por usuário. Todo plano inclui agentes de IA nativos e 14 dias de teste
              grátis, sem cartão de crédito.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {planos.map((plano, i) => {
              const destaque = i === 1;
              return (
                <Reveal key={plano.slug} delay={i * 80} className="h-full">
                  <div
                    className={`relative flex h-full flex-col rounded-xl border bg-bg p-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 ${styles.floatShadow} ${
                      destaque ? "border-accent" : "border-border"
                    }`}
                  >
                    {destaque && (
                      <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                        Mais popular
                      </span>
                    )}
                    <h3 className="font-semibold">{plano.name}</h3>
                    {plano.description && (
                      <p className="mt-1 min-h-[34px] text-sm text-muted-foreground">{plano.description}</p>
                    )}
                    <p className="mt-4 font-mono text-3xl font-semibold tracking-tight">
                      {precoFormatado(plano.price_cents, plano.currency)}
                      <span className="font-sans text-sm font-normal text-muted-foreground">
                        /{plano.billing_interval === "monthly" ? "mês" : "ano"}
                      </span>
                    </p>
                    <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                      {[
                        limiteFormatado(plano.max_seats, "usuário", "usuários"),
                        limiteFormatado(plano.max_whatsapp_numbers, "número de WhatsApp", "números de WhatsApp"),
                        limiteFormatado(plano.max_messages_month, "mensagem/mês", "mensagens/mês"),
                      ].map((linha) => (
                        <li key={linha} className="flex items-start gap-2">
                          <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                          {linha}
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="mt-6" variant={destaque ? "primary" : "outline"}>
                      <Link href={`/signup?plan=${plano.slug}`}>Começar teste grátis</Link>
                    </Button>
                  </div>
                </Reveal>
              );
            })}
            <Reveal delay={planos.length * 80} className="h-full">
              <div className="flex h-full flex-col rounded-xl border border-dashed border-border p-6">
                <h3 className="font-semibold">Enterprise</h3>
                <p className="mt-1 min-h-[34px] text-sm text-muted-foreground">
                  Usuários e números ilimitados, orçamento de IA e SLA personalizados.
                </p>
                <p className="mt-4 font-mono text-lg font-semibold text-muted-foreground">Sob consulta</p>
                <div className="flex-1" />
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/signup">Falar com vendas</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ — <details>/<summary> nativos: funcionam sem JavaScript nenhum e
          o conteúdo fechado continua indexável por buscadores. */}
      <section id="faq" className="border-t border-border bg-surface-elevated/40 py-20">
        {/* FAQPage schema (AEO): dados estáticos do próprio array FAQ, nunca
            entrada de usuário — JSON.stringify já escapa o necessário pra sair
            de dentro de um <script>. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ.map((item) => ({
                "@type": "Question",
                name: item.pergunta,
                acceptedAnswer: { "@type": "Answer", text: item.resposta },
              })),
            }),
          }}
        />
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Perguntas frequentes</h2>
          </Reveal>
          <div className="mt-10 divide-y divide-border border-y border-border">
            {FAQ.map((item, i) => (
              <Reveal key={item.pergunta} delay={Math.min(i * 60, 240)}>
                <details className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm font-semibold marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
                    {item.pergunta}
                    <CaretDown
                      size={16}
                      weight="bold"
                      className="shrink-0 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">{item.resposta}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final + footer */}
      <section className="border-t border-border bg-accent-soft/50 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Comece a atender pelo WhatsApp hoje</h2>
            <p className="mt-3 text-muted-foreground">14 dias grátis, sem cartão de crédito.</p>
            <Button asChild size="lg" className="mt-7">
              <Link href="#precos">Começar agora</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>{name} · Feito no Brasil</span>
          <nav className="flex items-center gap-4">
            <Link
              href="/legal/privacy"
              className="rounded-sm transition-colors duration-300 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Privacidade
            </Link>
            <Link
              href="/legal/terms"
              className="rounded-sm transition-colors duration-300 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Termos de uso
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
