"use client";

import { useSyncExternalStore } from "react";

import { useTheme, type Theme } from "@/lib/theme";
import { useHotkeys } from "react-hotkeys-hook";
import { Sun, Moon, MonitorPlay, SunHorizon } from "@/lib/ui/icons";
import { Button } from "@/components/ui/button";
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

const ROTULO: Record<Theme, string> = {
  auto: "Tema pela hora do dia: claro de dia, escuro à noite",
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
};

const nada = () => () => {};

export function ThemeToggle() {
  const t = useT();
  const { theme: escolhido, setTheme } = useTheme();
  // A escolha mora no `localStorage`, que o servidor não lê: ele sempre desenha
  // o padrão (`auto`). Desenhar a escolha já na hidratação faria o ícone e o
  // rótulo do servidor ficarem na tela — o React não remenda atributo divergente
  // — até o próximo clique. Então o primeiro desenho do navegador repete o do
  // servidor, e a escolha entra logo depois de hidratar.
  const hidratado = useSyncExternalStore(nada, () => true, () => false);
  const theme: Theme = hidratado ? escolhido : "auto";

  const cycle = () => {
    setTheme(PROXIMO[theme]);
  };

  useHotkeys("mod+shift+l", cycle, { preventDefault: true }, [theme]);

  const Icon = ICONE[theme];
  const rotulo = `${t(ROTULO[theme])}. ${t("Cmd+Shift+L para alternar.")}`;

  return (
    <Button variant="ghost" size="icon" onClick={cycle} aria-label={rotulo} title={rotulo}>
      <Icon size={16} aria-hidden />
    </Button>
  );
}
