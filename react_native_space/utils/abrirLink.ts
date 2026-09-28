import { Linking } from 'react-native';

/**
 * Abrir um endereço que veio do banco.
 *
 * O link de uma decisão é digitado por gente e guardado no banco, então na hora
 * de abrir ele é entrada, não constante de código. Só `http` e `https` passam:
 * um `javascript:` colado ali executaria no contexto da página na web, e um
 * esquema de outro app abriria o que não devia no celular.
 *
 * Quem grava hoje é só super-admin, o que torna o risco pequeno — mas a trava
 * custa três linhas e continua valendo no dia em que mais alguém puder gravar.
 */

export function linkSeguro(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  const limpo = bruto.trim();
  if (!limpo) return null;
  try {
    const url = new URL(limpo);
    return url.protocol === 'http:' || url.protocol === 'https:' ? limpo : null;
  } catch {
    // Sem esquema não é endereço absoluto: `www.exemplo.com` não abre sozinho.
    return null;
  }
}

/** Abre o endereço, se ele for de abrir. Devolve se abriu. */
export async function abrirLink(bruto: string | null | undefined): Promise<boolean> {
  const url = linkSeguro(bruto);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    // Sem navegador, ou o sistema recusou. O silêncio aqui é proposital: quem
    // chama mostra o endereço na tela, então a pessoa ainda pode copiar.
    return false;
  }
}
