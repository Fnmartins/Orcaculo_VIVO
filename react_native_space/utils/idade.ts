/**
 * Idade a partir da data de nascimento do perfil.
 *
 * Existe para a porta de idade da caixa de pergunta: conteúdo escrito por IA,
 * a pedido de quem escreve, é o que faz a classificação da loja subir. Sem
 * data no perfil a porta fica **fechada** — não saber não é o mesmo que poder.
 */

export const IDADE_MINIMA = 18;

/**
 * `data_nascimento` vem do Postgres como 'YYYY-MM-DD'. Não passa por `new
 * Date(string)` de propósito: data nua interpretada como UTC volta um dia
 * atrás em fuso negativo, e no Brasil isso erraria todo aniversário.
 */
export function idadeEm(
  nascimento: string | null | undefined,
  hoje: Date = new Date(),
): number | null {
  if (!nascimento) return null;
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(nascimento.trim());
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  let idade = hoje.getFullYear() - ano;
  const mesHoje = hoje.getMonth() + 1;
  if (mesHoje < mes || (mesHoje === mes && hoje.getDate() < dia)) idade -= 1;
  if (idade < 0 || idade > 130) return null;
  return idade;
}

/** Sem data, sem idade: devolve falso. A porta fecha por omissão. */
export function maiorDeIdade(
  nascimento: string | null | undefined,
  hoje: Date = new Date(),
): boolean {
  const idade = idadeEm(nascimento, hoje);
  return idade !== null && idade >= IDADE_MINIMA;
}
