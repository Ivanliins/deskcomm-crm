"use client";

import { useTheme, type Theme } from "@/lib/theme";
import { useHotkeys } from "react-hotkeys-hook";
import { Sun, Moon, MonitorPlay, SunHorizon } from "@/lib/ui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/i18n/useT";

/**
 * O ciclo começa no padrão (`auto`, a hora do dia) para que voltar a ele seja
 * sempre "clicar até o ícone do horizonte" — e não uma configuração escondida
 * que só se desfaz limpando o navegador.
 */
const PROXIMO: Record<Theme, Theme> = {
  auto: "light",
  light: "dark",
  dark: "system",
  system: "auto",
};

const ICONE = { auto: SunHorizon, light: Sun, dark: Moon, system: MonitorPlay } as const;

/** O que o modo quer dizer, por extenso — vai na dica do botão. */
const ROTULO: Record<Theme, string> = {
  auto: "Tema pela hora do dia: claro de dia, escuro à noite",
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
};

/**
 * ⚠️ O ATALHO `mod+shift+l` MORA AQUI DENTRO, e por isso ele só existe onde
 * este componente está montado. Até 20/09/2026 o `ThemeToggle` só era montado
 * pelo `components/shell/UserMenu.tsx` (a casca do tenant), o que deixava TODA a
 * superfície de Admin Plataforma sem botão e sem atalho: quem entrava direto
 * lá — e o `install.sh` cria o dono como platform admin, então é onde muita
 * gente cai primeiro — ficava preso ao tema que estivesse valendo, sem
 * descobrir que a troca existia numa outra casca.
 *
 * `className` existe para a tarja do Modo Plataforma, que tem 40px de altura e
 * não comporta os 44px de alvo de toque do `size="icon"`.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    setTheme(PROXIMO[theme]);
  };

  useHotkeys("mod+shift+l", cycle, { preventDefault: true }, [theme]);

  const Icon = ICONE[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={cycle}
      aria-label={t(`Tema: ${theme}. Cmd+Shift+L para alternar.`)}
      title={t(ROTULO[theme])}
      // O servidor não sabe a preferência salva no navegador do usuário --
      // renderiza um valor default e o cliente corrige pro valor real assim
      // que hidrata. É o mismatch ESPERADO de todo seletor de tema; React
      // "corrige" sozinho no primeiro render, só reclamava no console.
      suppressHydrationWarning
    >
      <Icon size={16} aria-hidden />
    </Button>
  );
}
