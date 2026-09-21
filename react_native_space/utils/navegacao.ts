import { router, type Href } from 'expo-router';

/**
 * Volta para a tela anterior; se não houver para onde voltar, vai para `destino`.
 *
 * Na web, `router.back()` sozinho não faz nada quando a tela abre sem histórico:
 * URL digitada, aba nova, página recarregada, ou vindo do site e da Stripe. A seta
 * de voltar parecia quebrada. Use esta função em todo botão de voltar do app.
 */
export function voltarOuIr(destino: Href = '/'): void {
  if (router.canGoBack()) router.back();
  else router.replace(destino);
}
