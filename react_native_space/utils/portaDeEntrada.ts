/**
 * Quem entra sem sessão só pode ver estas partes.
 *
 * Até 24/09 não havia trava nenhuma: a splash mandava todo mundo para `/(tabs)`
 * sem olhar sessão, e qualquer URL do app abria para visitante. O comentário no
 * código dizia "verifica sessão para decidir destino" e não verificava.
 *
 * `planos` fica de fora da trava de propósito: é página de venda, não mostra
 * dado de ninguém, e barrar quem ainda não tem conta seria barrar o cliente na
 * porta. `pagamento` é o retorno da Stripe — quem chega ali já tem sessão, mas
 * mandá-lo para o login no meio da volta do checkout seria perder a compra.
 */
const PUBLICAS = new Set(['welcome', 'auth', 'legal', 'planos', 'pagamento']);

/** Primeiro segmento da rota atual, como o expo-router entrega em `useSegments()`. */
export function rotaPublica(raiz: string | undefined): boolean {
  // Sem segmento é a splash (`app/index.tsx`), que decide o destino sozinha.
  if (!raiz) return true;
  return PUBLICAS.has(raiz);
}

export function precisaMandarParaLogin(
  raiz: string | undefined,
  temSessao: boolean,
  carregandoSessao: boolean,
): boolean {
  // Enquanto a sessão carrega, ninguém é mandado embora: no primeiro quadro
  // `sessao` é sempre nula, e agir aí expulsaria quem está logado.
  if (carregandoSessao) return false;
  if (temSessao) return false;
  return !rotaPublica(raiz);
}

/** Para onde a splash vai quando a animação termina. */
export function destinoDaSplash(
  temSessao: boolean,
  recuperandoSenha: boolean,
): '/auth/nova-senha' | '/(tabs)' | '/welcome' {
  if (recuperandoSenha) return '/auth/nova-senha';
  return temSessao ? '/(tabs)' : '/welcome';
}
