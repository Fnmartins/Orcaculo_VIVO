import { Alert, Platform } from 'react-native';

/**
 * Alerta cross-platform.
 *
 * Na WEB o `Alert.alert` da React Native e um no-op (nao mostra nada e nao
 * dispara o callback dos botoes) — isso fazia telas de auth "travarem": o
 * sucesso do cadastro navegava dentro do `onPress` de um Alert que nunca
 * aparecia. Aqui, na web usamos `window.alert` (bloqueante) e SEMPRE
 * disparamos o callback depois, garantindo que a navegacao aconteca mesmo
 * que o dialog nao apareca. No mobile, mantem o Alert.alert nativo.
 */
export function mostrarAlerta(
  titulo: string,
  mensagem?: string,
  aoConfirmar?: () => void,
): void {
  if (Platform.OS === 'web') {
    const texto = mensagem ? `${titulo}\n\n${mensagem}` : titulo;
    const g = globalThis as { alert?: (msg?: string) => void };
    if (typeof g.alert === 'function') {
      g.alert(texto);
    }
    aoConfirmar?.();
    return;
  }

  Alert.alert(
    titulo,
    mensagem,
    aoConfirmar ? [{ text: 'OK', onPress: aoConfirmar }] : undefined,
  );
}

/**
 * Confirmacao cross-platform (Cancelar / Confirmar).
 * Na WEB usa window.confirm (o Alert.alert nativo e no-op la, entao o botao
 * de acao — "Sair", "Excluir" — nunca disparava). No mobile, Alert.alert com
 * os dois botoes. So chama `aoConfirmar` se o usuario confirmar.
 */
export function confirmarAcao(
  titulo: string,
  mensagem: string,
  aoConfirmar: () => void,
  opts?: { confirmarLabel?: string; cancelarLabel?: string; destrutivo?: boolean },
): void {
  const confirmarLabel = opts?.confirmarLabel ?? 'Confirmar';

  if (Platform.OS === 'web') {
    const g = globalThis as { confirm?: (mensagem?: string) => boolean };
    const ok = typeof g.confirm === 'function'
      ? g.confirm(mensagem ? `${titulo}\n\n${mensagem}` : titulo)
      : true;
    if (ok) aoConfirmar();
    return;
  }

  Alert.alert(titulo, mensagem, [
    { text: opts?.cancelarLabel ?? 'Cancelar', style: 'cancel' },
    {
      text: confirmarLabel,
      style: opts?.destrutivo ? 'destructive' : 'default',
      onPress: aoConfirmar,
    },
  ]);
}
