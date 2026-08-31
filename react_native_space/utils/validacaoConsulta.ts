export function textoConsultaValido(valor?: string) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

export function dataConsultaValida(dia?: string, mes?: string, ano?: string) {
  if (!dia || !mes || !ano) return false;

  const d = Number(dia);
  const m = Number(mes);
  const a = Number(ano);
  const anoAtual = new Date().getFullYear();

  if (![d, m, a].every(Number.isInteger) || a < 1900 || a > anoAtual) return false;

  const data = new Date(Date.UTC(a, m - 1, d));
  return data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d;
}

export function horarioConsultaValido(hora?: string, minuto?: string) {
  if (hora === undefined || minuto === undefined || hora === '' || minuto === '') return false;
  const h = Number(hora);
  const min = Number(minuto);
  return Number.isInteger(h) && h >= 0 && h <= 23 && Number.isInteger(min) && min >= 0 && min <= 59;
}
