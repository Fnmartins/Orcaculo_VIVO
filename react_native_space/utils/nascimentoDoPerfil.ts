import type { Perfil } from '../services/auth';
import { dataConsultaValida, textoConsultaValido } from './validacaoConsulta';

/**
 * A ponte entre o perfil e os formulários que pedem nome e data de nascimento.
 *
 * Três telas — numerologia, mapa numerológico e matriz do destino — pediam as
 * mesmas duas coisas, sempre do zero, mesmo para quem já havia preenchido no
 * mapa astral. Item 18 do roadmap: os dados moram num lugar só, e a ferramenta
 * pede apenas o que falta.
 *
 * Aqui só a conversão, sem tela e sem rede: é o que dá para testar.
 */

export interface CamposNascimento {
  /** O nome de nascimento, o de registro — não o nome de tela. */
  nome: string;
  dia: string;
  mes: string;
  ano: string;
}

export const CAMPOS_VAZIOS: CamposNascimento = { nome: '', dia: '', mes: '', ano: '' };

/** '05' → '5'. O formulário mostra o que a pessoa digitaria, sem zero à frente. */
function semZeroAEsquerda(parte: string): string {
  const numero = parseInt(parte, 10);
  return Number.isFinite(numero) ? String(numero) : '';
}

/**
 * O que o perfil já sabe, pronto para entrar nos campos.
 *
 * **O nome de tela não serve como nome de nascimento.** `perfil.nome` é como a
 * pessoa quer ser chamada — pode ser apelido, primeiro nome ou nome social. A
 * numerologia trabalha sobre o nome de registro, letra por letra. Preencher um
 * com o outro entregaria um mapa numerológico calculado sobre o nome errado, sem
 * ninguém perceber. Então, sem `nascimento_nome`, o campo nasce vazio.
 */
export function camposDoPerfil(perfil: Perfil | null | undefined): CamposNascimento {
  if (!perfil) return CAMPOS_VAZIOS;

  const nome = perfil.nascimento_nome?.trim() ?? '';
  const data = perfil.data_nascimento ?? '';
  // Guardado como 'YYYY-MM-DD'. Qualquer outro formato é dado velho ou
  // estragado: melhor campo vazio do que data remontada errada.
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);

  return {
    nome,
    dia: partes ? semZeroAEsquerda(partes[3]) : '',
    mes: partes ? semZeroAEsquerda(partes[2]) : '',
    ano: partes ? partes[1] : '',
  };
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * '1985-07-13' → '13 de julho de 1985'. Nulo quando não há data guardada.
 *
 * Montado à mão, sem `new Date`, de propósito: `new Date('1985-07-13')` é meia-
 * noite UTC, e no fuso do Brasil isso volta para o dia 12. A data de nascimento
 * não tem hora nem fuso — é um dia no calendário, e tratá-la como instante faz
 * a tela mostrar o dia anterior para metade do mundo.
 */
export function dataEmPortugues(data: string | null | undefined): string | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data ?? '');
  if (!partes) return null;
  const mes = MESES[parseInt(partes[2], 10) - 1];
  if (!mes) return null;
  return `${parseInt(partes[3], 10)} de ${mes} de ${partes[1]}`;
}

/** O que o perfil ainda não tem. Serve para a tela dizer por que está pedindo. */
export function faltaNoPerfil(perfil: Perfil | null | undefined): ('nome' | 'data')[] {
  const campos = camposDoPerfil(perfil);
  const falta: ('nome' | 'data')[] = [];
  if (!campos.nome) falta.push('nome');
  if (!campos.ano) falta.push('data');
  return falta;
}

/**
 * O que vale gravar de volta no perfil, ou nulo quando nada mudou.
 *
 * Devolver nulo em vez de gravar sempre evita uma escrita por leitura tirada — e
 * evita reescrever o mesmo valor, que carimbaria alteração no perfil sem
 * nenhuma alteração ter acontecido.
 */
export function nascimentoParaSalvar(
  campos: CamposNascimento,
  perfil: Perfil | null | undefined,
): Partial<Pick<Perfil, 'nascimento_nome' | 'data_nascimento'>> | null {
  const atual = camposDoPerfil(perfil);
  const mudancas: Partial<Pick<Perfil, 'nascimento_nome' | 'data_nascimento'>> = {};

  const nome = campos.nome.trim().replace(/\s+/g, ' ');
  // Nome de uma palavra não sobe: não é nome de registro, e gravá-lo faria a
  // próxima tela nascer preenchida errada. É a mesma exigência que os três
  // formulários já fazem antes de calcular — aqui ela vale para o que fica
  // guardado, que dura mais que a leitura.
  if (nome && nome !== atual.nome
      && textoConsultaValido(nome) && nome.split(' ').length >= 2) {
    mudancas.nascimento_nome = nome;
  }

  const { dia, mes, ano } = campos;
  if (dataConsultaValida(dia, mes, ano)) {
    const data = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    if (data !== perfil?.data_nascimento) mudancas.data_nascimento = data;
  }

  return Object.keys(mudancas).length > 0 ? mudancas : null;
}
