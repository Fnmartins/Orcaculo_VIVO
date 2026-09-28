import { Share, Platform } from 'react-native';

const ASSINATURA = '\n\n🔮 Arcanus — arcanus.com.br';

export interface DadosCompartilhamento {
  tipo: string;
  titulo: string;
  resumo: string;
  conselho?: string;
}

function montarMensagem(dados: DadosCompartilhamento): string {
  const linhas: string[] = [];
  linhas.push(`✨ ${dados.titulo}`);
  linhas.push('');
  linhas.push(dados.resumo);
  if (dados.conselho) {
    linhas.push('');
    linhas.push(`💡 ${dados.conselho}`);
  }
  linhas.push(ASSINATURA);
  return linhas.join('\n');
}

export async function compartilharResultado(dados: DadosCompartilhamento): Promise<void> {
  const mensagem = montarMensagem(dados);
  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { title: dados.titulo, message: mensagem }
        : { message: mensagem }
    );
  } catch {
    // Usuário cancelou ou plataforma não suporta
  }
}

export async function compartilharTarot(params: {
  cartas: Array<{ nomeCompleto: string; conselho: string }>;
}): Promise<void> {
  const { cartas } = params;
  const linhas: string[] = [];
  linhas.push('🃏 Minha Leitura de Tarot');
  linhas.push('');
  const posicoes = ['Passado', 'Presente', 'Futuro'];
  cartas.forEach((c, i) => {
    linhas.push(`${posicoes[i] ?? `Carta ${i + 1}`}: ${c.nomeCompleto}`);
  });
  linhas.push('');
  if (cartas[1]) {
    linhas.push(`💡 ${cartas[1].conselho}`);
  }
  linhas.push(ASSINATURA);

  await Share.share({ message: linhas.join('\n') });
}

export async function compartilharBuzios(params: {
  nomeOdu: string;
  descricao: string;
  conselho?: string;
}): Promise<void> {
  const linhas: string[] = [];
  linhas.push(`🐚 Jogo de Búzios — ${params.nomeOdu}`);
  linhas.push('');
  linhas.push(params.descricao);
  if (params.conselho) {
    linhas.push('');
    linhas.push(`🙏 ${params.conselho}`);
  }
  linhas.push(ASSINATURA);

  await Share.share({ message: linhas.join('\n') });
}

/**
 * O mapa natal inteiro.
 *
 * A primeira versão mandava só as três posições, achando que mapa completo não
 * cabia numa mensagem. Cabe, e é o que a pessoa quer mandar: quem compartilha
 * o próprio mapa está mandando a leitura, não o índice dela.
 */
export async function compartilharMapaAstral(params: {
  /** Uma linha por posição, já escrita: "☀ Sol em Câncer, 21° 24′". */
  posicoes: string[];
  equilibrio?: string;
  leitura?: {
    titulo: string;
    narrativa: string;
    forca?: string;
    tensao?: string;
    conselho?: string;
    amor?: string;
    trabalho?: string;
    dinheiro?: string;
    caminho?: string;
  };
}): Promise<void> {
  const partes: string[] = [...params.posicoes];

  if (params.equilibrio) partes.push('', params.equilibrio);

  if (params.leitura) {
    partes.push('', `— ${params.leitura.titulo} —`, params.leitura.narrativa);
    if (params.leitura.forca) partes.push('', params.leitura.forca);
    if (params.leitura.tensao) partes.push('', params.leitura.tensao);
    // As quatro areas vao junto: o que se le na tela e o que se manda tem de
    // ser a mesma leitura. Mandar so metade foi defeito uma vez ja.
    for (const [rotulo, texto] of [
      ['Amor', params.leitura.amor],
      ['Trabalho', params.leitura.trabalho],
      ['Dinheiro', params.leitura.dinheiro],
      ['Caminho', params.leitura.caminho],
    ] as const) {
      if (texto) partes.push('', `${rotulo}: ${texto}`);
    }
  }

  await compartilharResultado({
    tipo: 'mapa-astral',
    titulo: 'Meu Mapa Astral',
    resumo: partes.join('\n'),
    conselho: params.leitura?.conselho,
  });
}

export async function compartilharAnaliseIA(params: {
  tipo: 'cafe' | 'quiromancia';
  titulo: string;
  resumo: string;
}): Promise<void> {
  const tipoLabel = params.tipo === 'cafe' ? '☕ Borra de Café' : '✋ Quiromância';
  const linhas: string[] = [];
  linhas.push(`${tipoLabel} — ${params.titulo}`);
  linhas.push('');
  linhas.push(params.resumo);
  linhas.push(ASSINATURA);

  await Share.share({ message: linhas.join('\n') });
}
