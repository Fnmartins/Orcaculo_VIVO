import { Share, Platform } from 'react-native';

const ASSINATURA = '\n\n🔮 Oráculo Vivo — oraculovivo.app';

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
