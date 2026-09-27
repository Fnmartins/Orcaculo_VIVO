/**
 * Cidades de nascimento, com coordenada e fuso.
 *
 * O ascendente depende do lugar: sem latitude e longitude não existe horizonte,
 * e sem o nome IANA do fuso não dá para saber se havia horário de verão no dia.
 * Até aqui a cidade era texto livre e não entrava em cálculo nenhum.
 *
 * Esta lista é **curada, não é o GeoNames** — as 27 capitais, as maiores cidades
 * brasileiras e os destinos onde há mais brasileiro fora. O conselho (M2) pediu
 * a base offline do GeoNames; ela vem depois, e este arquivo é o suficiente para
 * o mapa existir sem chutar coordenada.
 *
 * `offsetPadrao` é o fuso **sem** horário de verão, usado só como reserva se o
 * ambiente não souber fusos nomeados. Cada valor daqui é conferido contra o
 * banco de fusos em `data/__tests__/cidades.test.ts` — coordenada e fuso escritos
 * à mão pedem teste, não confiança.
 *
 * Escolher a cidade vizinha em vez da exata muda o ascendente em cerca de um
 * grau por 100 km, bem menos que a incerteza da hora que quase todo mundo tem.
 */

export interface Cidade {
  id: string;
  nome: string;
  /** Sigla do estado, para as brasileiras. */
  uf?: string;
  pais: string;
  lat: number;
  /** Positiva a leste de Greenwich. */
  lon: number;
  fuso: string;
  offsetPadrao: number;
}

export const CIDADES: Cidade[] = [
  // ── Capitais brasileiras ────────────────────────────────────────────────
  { id: 'rio-branco-ac', nome: 'Rio Branco', uf: 'AC', pais: 'Brasil', lat: -9.97, lon: -67.81, fuso: 'America/Rio_Branco', offsetPadrao: -300 },
  { id: 'maceio-al', nome: 'Maceió', uf: 'AL', pais: 'Brasil', lat: -9.67, lon: -35.74, fuso: 'America/Maceio', offsetPadrao: -180 },
  { id: 'macapa-ap', nome: 'Macapá', uf: 'AP', pais: 'Brasil', lat: 0.03, lon: -51.07, fuso: 'America/Belem', offsetPadrao: -180 },
  { id: 'manaus-am', nome: 'Manaus', uf: 'AM', pais: 'Brasil', lat: -3.12, lon: -60.02, fuso: 'America/Manaus', offsetPadrao: -240 },
  { id: 'salvador-ba', nome: 'Salvador', uf: 'BA', pais: 'Brasil', lat: -12.97, lon: -38.50, fuso: 'America/Bahia', offsetPadrao: -180 },
  { id: 'fortaleza-ce', nome: 'Fortaleza', uf: 'CE', pais: 'Brasil', lat: -3.73, lon: -38.52, fuso: 'America/Fortaleza', offsetPadrao: -180 },
  { id: 'brasilia-df', nome: 'Brasília', uf: 'DF', pais: 'Brasil', lat: -15.78, lon: -47.93, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'vitoria-es', nome: 'Vitória', uf: 'ES', pais: 'Brasil', lat: -20.32, lon: -40.34, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'goiania-go', nome: 'Goiânia', uf: 'GO', pais: 'Brasil', lat: -16.69, lon: -49.26, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'sao-luis-ma', nome: 'São Luís', uf: 'MA', pais: 'Brasil', lat: -2.53, lon: -44.30, fuso: 'America/Fortaleza', offsetPadrao: -180 },
  { id: 'cuiaba-mt', nome: 'Cuiabá', uf: 'MT', pais: 'Brasil', lat: -15.60, lon: -56.10, fuso: 'America/Cuiaba', offsetPadrao: -240 },
  { id: 'campo-grande-ms', nome: 'Campo Grande', uf: 'MS', pais: 'Brasil', lat: -20.44, lon: -54.65, fuso: 'America/Campo_Grande', offsetPadrao: -240 },
  { id: 'belo-horizonte-mg', nome: 'Belo Horizonte', uf: 'MG', pais: 'Brasil', lat: -19.92, lon: -43.94, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'belem-pa', nome: 'Belém', uf: 'PA', pais: 'Brasil', lat: -1.46, lon: -48.50, fuso: 'America/Belem', offsetPadrao: -180 },
  { id: 'joao-pessoa-pb', nome: 'João Pessoa', uf: 'PB', pais: 'Brasil', lat: -7.12, lon: -34.88, fuso: 'America/Fortaleza', offsetPadrao: -180 },
  { id: 'curitiba-pr', nome: 'Curitiba', uf: 'PR', pais: 'Brasil', lat: -25.43, lon: -49.27, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'recife-pe', nome: 'Recife', uf: 'PE', pais: 'Brasil', lat: -8.05, lon: -34.88, fuso: 'America/Recife', offsetPadrao: -180 },
  { id: 'teresina-pi', nome: 'Teresina', uf: 'PI', pais: 'Brasil', lat: -5.09, lon: -42.80, fuso: 'America/Fortaleza', offsetPadrao: -180 },
  { id: 'rio-de-janeiro-rj', nome: 'Rio de Janeiro', uf: 'RJ', pais: 'Brasil', lat: -22.91, lon: -43.17, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'natal-rn', nome: 'Natal', uf: 'RN', pais: 'Brasil', lat: -5.79, lon: -35.21, fuso: 'America/Fortaleza', offsetPadrao: -180 },
  { id: 'porto-alegre-rs', nome: 'Porto Alegre', uf: 'RS', pais: 'Brasil', lat: -30.03, lon: -51.23, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'porto-velho-ro', nome: 'Porto Velho', uf: 'RO', pais: 'Brasil', lat: -8.76, lon: -63.90, fuso: 'America/Porto_Velho', offsetPadrao: -240 },
  { id: 'boa-vista-rr', nome: 'Boa Vista', uf: 'RR', pais: 'Brasil', lat: 2.82, lon: -60.67, fuso: 'America/Boa_Vista', offsetPadrao: -240 },
  { id: 'florianopolis-sc', nome: 'Florianópolis', uf: 'SC', pais: 'Brasil', lat: -27.60, lon: -48.55, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'sao-paulo-sp', nome: 'São Paulo', uf: 'SP', pais: 'Brasil', lat: -23.55, lon: -46.63, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'aracaju-se', nome: 'Aracaju', uf: 'SE', pais: 'Brasil', lat: -10.91, lon: -37.07, fuso: 'America/Maceio', offsetPadrao: -180 },
  { id: 'palmas-to', nome: 'Palmas', uf: 'TO', pais: 'Brasil', lat: -10.18, lon: -48.33, fuso: 'America/Araguaina', offsetPadrao: -180 },

  // ── Outras cidades brasileiras grandes ──────────────────────────────────
  { id: 'guarulhos-sp', nome: 'Guarulhos', uf: 'SP', pais: 'Brasil', lat: -23.46, lon: -46.53, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'campinas-sp', nome: 'Campinas', uf: 'SP', pais: 'Brasil', lat: -22.91, lon: -47.06, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'santos-sp', nome: 'Santos', uf: 'SP', pais: 'Brasil', lat: -23.96, lon: -46.33, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'sao-jose-dos-campos-sp', nome: 'São José dos Campos', uf: 'SP', pais: 'Brasil', lat: -23.18, lon: -45.89, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'sorocaba-sp', nome: 'Sorocaba', uf: 'SP', pais: 'Brasil', lat: -23.50, lon: -47.46, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'ribeirao-preto-sp', nome: 'Ribeirão Preto', uf: 'SP', pais: 'Brasil', lat: -21.18, lon: -47.81, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'niteroi-rj', nome: 'Niterói', uf: 'RJ', pais: 'Brasil', lat: -22.88, lon: -43.10, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'duque-de-caxias-rj', nome: 'Duque de Caxias', uf: 'RJ', pais: 'Brasil', lat: -22.79, lon: -43.31, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'uberlandia-mg', nome: 'Uberlândia', uf: 'MG', pais: 'Brasil', lat: -18.91, lon: -48.28, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'contagem-mg', nome: 'Contagem', uf: 'MG', pais: 'Brasil', lat: -19.93, lon: -44.05, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'londrina-pr', nome: 'Londrina', uf: 'PR', pais: 'Brasil', lat: -23.31, lon: -51.16, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'joinville-sc', nome: 'Joinville', uf: 'SC', pais: 'Brasil', lat: -26.30, lon: -48.85, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'caxias-do-sul-rs', nome: 'Caxias do Sul', uf: 'RS', pais: 'Brasil', lat: -29.17, lon: -51.18, fuso: 'America/Sao_Paulo', offsetPadrao: -180 },
  { id: 'feira-de-santana-ba', nome: 'Feira de Santana', uf: 'BA', pais: 'Brasil', lat: -12.27, lon: -38.96, fuso: 'America/Bahia', offsetPadrao: -180 },

  // ── Fora do Brasil ──────────────────────────────────────────────────────
  { id: 'lisboa-pt', nome: 'Lisboa', pais: 'Portugal', lat: 38.72, lon: -9.14, fuso: 'Europe/Lisbon', offsetPadrao: 0 },
  { id: 'porto-pt', nome: 'Porto', pais: 'Portugal', lat: 41.15, lon: -8.61, fuso: 'Europe/Lisbon', offsetPadrao: 0 },
  { id: 'madri-es', nome: 'Madri', pais: 'Espanha', lat: 40.42, lon: -3.70, fuso: 'Europe/Madrid', offsetPadrao: 60 },
  { id: 'londres-gb', nome: 'Londres', pais: 'Reino Unido', lat: 51.51, lon: -0.13, fuso: 'Europe/London', offsetPadrao: 0 },
  { id: 'paris-fr', nome: 'Paris', pais: 'França', lat: 48.86, lon: 2.35, fuso: 'Europe/Paris', offsetPadrao: 60 },
  { id: 'nova-york-us', nome: 'Nova York', pais: 'Estados Unidos', lat: 40.71, lon: -74.01, fuso: 'America/New_York', offsetPadrao: -300 },
  { id: 'boston-us', nome: 'Boston', pais: 'Estados Unidos', lat: 42.36, lon: -71.06, fuso: 'America/New_York', offsetPadrao: -300 },
  { id: 'miami-us', nome: 'Miami', pais: 'Estados Unidos', lat: 25.76, lon: -80.19, fuso: 'America/New_York', offsetPadrao: -300 },
  { id: 'orlando-us', nome: 'Orlando', pais: 'Estados Unidos', lat: 28.54, lon: -81.38, fuso: 'America/New_York', offsetPadrao: -300 },
  { id: 'toronto-ca', nome: 'Toronto', pais: 'Canadá', lat: 43.65, lon: -79.38, fuso: 'America/Toronto', offsetPadrao: -300 },
  { id: 'montreal-ca', nome: 'Montreal', pais: 'Canadá', lat: 45.50, lon: -73.57, fuso: 'America/Toronto', offsetPadrao: -300 },
  { id: 'buenos-aires-ar', nome: 'Buenos Aires', pais: 'Argentina', lat: -34.60, lon: -58.38, fuso: 'America/Argentina/Buenos_Aires', offsetPadrao: -180 },
  { id: 'toquio-jp', nome: 'Tóquio', pais: 'Japão', lat: 35.68, lon: 139.69, fuso: 'Asia/Tokyo', offsetPadrao: 540 },
];

/** Sem acento, minúsculo — para a busca aceitar "sao paulo" e "São Paulo". */
function achatar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function buscarCidades(termo: string, limite = 8): Cidade[] {
  const alvo = achatar(termo);
  if (!alvo) return [];
  const comeca: Cidade[] = [];
  const contem: Cidade[] = [];
  for (const cidade of CIDADES) {
    const nome = achatar(cidade.nome);
    const completo = achatar(`${cidade.nome} ${cidade.uf ?? cidade.pais}`);
    if (nome.startsWith(alvo)) comeca.push(cidade);
    else if (completo.includes(alvo)) contem.push(cidade);
  }
  return [...comeca, ...contem].slice(0, limite);
}

export function cidadePorId(id: string): Cidade | null {
  return CIDADES.find((c) => c.id === id) ?? null;
}

export function rotuloDaCidade(cidade: Cidade): string {
  return cidade.uf ? `${cidade.nome}, ${cidade.uf}` : `${cidade.nome}, ${cidade.pais}`;
}
