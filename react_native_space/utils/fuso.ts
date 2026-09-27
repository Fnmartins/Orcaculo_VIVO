/**
 * Hora local de nascimento → instante em UTC.
 *
 * É o passo mais perigoso do mapa astral. Uma hora de erro move o ascendente
 * cerca de 15 graus — meio signo — e o Brasil teve horário de verão de 1985 a
 * 2019, com datas decididas por decreto, ano a ano, e valendo em regiões
 * diferentes a cada época.
 *
 * Nada disso vem de tabela escrita por mim: quem responde é o banco de fusos do
 * ambiente, pelo `Intl` com fuso nomeado. Duas coisas que eu diria errado e o
 * banco corrigiu: **Fortaleza estava em horário de verão em janeiro de 1988**, e
 * Rio Branco naquele mesmo mês estava em UTC−4.
 *
 * O app roda na web, onde `Intl` com `timeZone` existe e traz a história
 * completa. Se um dia rodar num ambiente sem esse suporte (o Hermes do Android
 * é o caso conhecido), a conversão usa o fuso padrão da cidade e devolve
 * `aproximado: true` — e aí a tela precisa dizer que o ascendente pode estar uma
 * hora fora, em vez de fingir precisão.
 */

export interface HoraDeNascimento {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  /** Nome IANA, como 'America/Sao_Paulo'. */
  fuso: string;
  /** Usado só se o ambiente não souber fusos nomeados. Minutos, negativo a oeste. */
  offsetPadrao: number;
}

export interface InstanteConvertido {
  momento: Date;
  /** Offset aplicado, em minutos. -180 = UTC−3. */
  offsetMinutos: number;
  /** Verdadeiro quando o horário de verão não pôde ser consultado. */
  aproximado: boolean;
}

export function suportaFusoNomeado(fuso = 'America/Sao_Paulo'): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: fuso }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Offset do fuso naquele instante, em minutos (negativo a oeste de Greenwich).
 *
 * O truque é o padrão: formatar o instante no fuso pedido, ler os campos como
 * se fossem UTC e medir a diferença.
 */
export function offsetDoFuso(fuso: string, instante: Date): number {
  const formato = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const partes: Record<string, string> = {};
  for (const parte of formato.formatToParts(instante)) partes[parte.type] = parte.value;
  const comoSeFosseUTC = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    // Alguns ambientes devolvem 24 para a meia-noite.
    partes.hour === '24' ? 0 : Number(partes.hour),
    Number(partes.minute),
    Number(partes.second),
  );
  return (comoSeFosseUTC - instante.getTime()) / 60000;
}

export function paraUTC(entrada: HoraDeNascimento): InstanteConvertido {
  const comoSeFosseUTC = Date.UTC(
    entrada.ano, entrada.mes - 1, entrada.dia, entrada.hora, entrada.minuto, 0,
  );

  if (!suportaFusoNomeado(entrada.fuso)) {
    return {
      momento: new Date(comoSeFosseUTC - entrada.offsetPadrao * 60000),
      offsetMinutos: entrada.offsetPadrao,
      aproximado: true,
    };
  }

  // Duas passadas: a primeira estima o offset com o instante errado (o local
  // tratado como UTC), a segunda confere no instante já corrigido. É o que
  // resolve nascer perto da virada do horário de verão.
  const primeiro = offsetDoFuso(entrada.fuso, new Date(comoSeFosseUTC));
  const tentativa = comoSeFosseUTC - primeiro * 60000;
  const offsetMinutos = offsetDoFuso(entrada.fuso, new Date(tentativa));

  return {
    momento: new Date(comoSeFosseUTC - offsetMinutos * 60000),
    offsetMinutos,
    aproximado: false,
  };
}

/** 'UTC−3' ou 'UTC−2:30', para a tela mostrar o que foi usado. */
export function rotuloDoOffset(minutos: number): string {
  const sinal = minutos < 0 ? '−' : '+';
  const total = Math.abs(minutos);
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return `UTC${sinal}${horas}${resto ? `:${String(resto).padStart(2, '0')}` : ''}`;
}
