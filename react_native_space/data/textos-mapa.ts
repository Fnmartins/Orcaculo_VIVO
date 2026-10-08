import type { Corpo } from './efemerides';

/**
 * A camada didática do mapa: **o que cada peça significa**, antes de qualquer
 * "sua Lua em Escorpião".
 *
 * É o caminho aprovado para o M3 (26/09): biblioteca pequena e revisável aqui,
 * e a leitura da combinação pessoal escrita na hora pela IA, com as regras que
 * já vivem em `supabase/functions/_shared/regras-ia.ts`. Uma astróloga revisa
 * 54 textos numa semana; 280 não.
 *
 * **Pendente de revisão por astróloga** — é a condição que o conselho pôs e que
 * o Fabiano ainda vai combinar com quem revisa. O que está aqui é a definição
 * corrente de cada peça, sem previsão, sem promessa e sem determinismo: o mapa
 * descreve tendências e possibilidades, nunca fatos inevitáveis.
 */

export interface TextoDoCorpo {
  /** Como a seção se chama na tela. */
  titulo: string;
  /** O que essa peça do mapa representa, em duas ou três frases. */
  papel: string;
}

export const TEXTO_CORPO: Record<Corpo, TextoDoCorpo> = {
  sol: {
    titulo: 'Sol',
    papel: 'O Sol é o centro do mapa: a essência, aquilo que você veio expressar e desenvolver ao longo da vida. É onde você se reconhece quando está sendo você mesmo, sem representar papel para ninguém.',
  },
  lua: {
    titulo: 'Lua',
    papel: 'A Lua é o mundo de dentro: a memória, o que acalma, o que assusta, o jeito de cuidar e de pedir cuidado. É a parte que aparece quando você está em casa, cansado ou com quem confia.',
  },
  mercurio: {
    titulo: 'Mercúrio',
    papel: 'Mercúrio é como você pensa e se explica: o ritmo do raciocínio, o modo de escutar, de aprender e de colocar em palavras o que sentiu.',
  },
  venus: {
    titulo: 'Vênus',
    papel: 'Vênus é o que te dá prazer e o que você valoriza: como você se aproxima, como gosta de ser gostado, e o que faz um lugar ou uma pessoa parecerem bonitos para você.',
  },
  marte: {
    titulo: 'Marte',
    papel: 'Marte é a ação e o desejo: como você começa, como discute, como sustenta um limite e o que faz você sair do lugar quando algo importa.',
  },
  jupiter: {
    titulo: 'Júpiter',
    papel: 'Júpiter é onde você se expande: o que te dá senso de possibilidade e vontade de crescer. Também é onde é fácil exagerar, porque parece que sempre cabe mais.',
  },
  saturno: {
    titulo: 'Saturno',
    papel: 'Saturno é onde a vida pede tempo e método: a área em que as coisas custam mais e, por isso mesmo, ficam mais firmes. É a maturidade que se constrói, não a que se recebe.',
  },
  urano: {
    titulo: 'Urano',
    papel: 'Urano é onde você rompe: a parte que não aceita fórmula pronta e precisa de espaço para fazer diferente. Costuma aparecer em mudanças que ninguém viu chegando.',
  },
  netuno: {
    titulo: 'Netuno',
    papel: 'Netuno é onde a fronteira se dissolve: sensibilidade, imaginação e o que você idealiza. É também onde é mais fácil se confundir entre o que existe e o que você gostaria que existisse.',
  },
  plutao: {
    titulo: 'Plutão',
    papel: 'Plutão é onde algo termina para que outra coisa comece: intensidade, o que você não controla e o que se transforma quando você atravessa.',
  },
};

export const TEXTO_ASCENDENTE = {
  titulo: 'Ascendente',
  papel: 'O ascendente é o grau do zodíaco que estava nascendo no horizonte leste na sua hora e no seu lugar de nascimento. É o gesto de entrada: como você chega, como o mundo te vê antes de te conhecer, e o corpo que apresenta isso. Ele depende da hora e da cidade — por isso um mapa sem hora não tem ascendente.',
};

export const TEXTO_ELEMENTO: Record<string, string> = {
  Fogo: 'Fogo é a energia que se acende e move: ação, entusiasmo, vontade de começar.',
  Terra: 'Terra é a energia que assenta: concretude, constância, o que se constrói com o tempo.',
  Ar: 'Ar é a energia que circula: ideias, conversa, curiosidade, troca.',
  Água: 'Água é a energia que sente: emoção, intuição, memória, vínculo.',
};

export const TEXTO_QUALIDADE: Record<string, string> = {
  Cardinal: 'Cardinal é o que inicia e abre caminho.',
  Fixo: 'Fixo é o que sustenta e aprofunda.',
  Mutável: 'Mutável é o que se adapta e transforma.',
};

export const TEXTO_RETROGRADO = 'Retrógrado não quer dizer "ruim" nem "andando para trás": é a aparência do movimento visto da Terra. No mapa, costuma indicar que aquela função funciona mais para dentro — revisando, remoendo e amadurecendo antes de aparecer.';

export const TEXTO_ELEMENTO_AUSENTE = 'Um elemento sem nenhum planeta não é falta: é um jeito de dizer que aquela energia não é a sua língua natural, e que você provavelmente a aprendeu — ou ainda vai aprender — com quem a tem de sobra.';

/**
 * A tela já dizia "Calculadas pelo sistema Placidus", o que nomeia a escolha mas
 * não diz a consequência dela. Quem comparar o Arcanus com outro site vai ver
 * casas diferentes para a mesma hora e o mesmo lugar, e concluir que um dos dois
 * está quebrado — e nenhum está.
 *
 * Mesmo argumento da tabela caldaica na numerologia e da mão dominante na
 * quiromancia: o que faltava não era a ressalva, era dizer que existe escolha.
 */
export const TEXTO_SISTEMA_DE_CASAS = 'Placidus é o sistema de casas mais usado, e é o que este mapa usa — mas não é o único. Casas inteiras, o mais antigo com registro escrito e ainda o padrão na astrologia védica, dá a cada casa exatos 30 graus e chega a outro desenho. Se você comparar com outro site e as casas não baterem, é por isso: nenhum dos dois está errado.';

/**
 * O que os nodos são, antes de qualquer significado.
 *
 * Mesmo cuidado de `TEXTO_RETROGRADO`: quem lê "nodo norte em Áries" supõe mais
 * um planeta, e eles não são corpo nenhum — são a interseção de dois planos. A
 * escolha entre nodo verdadeiro e médio também vai declarada, pelo mesmo
 * argumento de `TEXTO_SISTEMA_DE_CASAS`.
 */
export const TEXTO_NODOS = 'Os nodos não são planetas: são os dois pontos onde o caminho da Lua cruza o caminho aparente do Sol. Por isso andam sempre juntos, em lados opostos do mapa, e andam para trás — dão a volta inteira a cada dezoito anos e meio. Este mapa usa o nodo verdadeiro, que é o mais comum nos apps ocidentais; escolas que usam o nodo médio chegam a até um grau e meio daqui.';

export const TEXTO_NODO_NORTE = 'A Cabeça do Dragão aponta para o lado que ainda não é confortável: a direção em que você cresce quando escolhe o que não é automático. O signo e a casa dizem onde isso acontece.';

export const TEXTO_NODO_SUL = 'A Cauda do Dragão é o terreno conhecido — o que você já faz bem, às vezes bem demais, e para onde volta quando quer descansar ou se esconder. Não é defeito: é repertório pronto.';

/** O que o mapa é, e o que ele não é. Aparece antes de qualquer interpretação. */
export const TEXTO_ABERTURA = 'O mapa astral é uma fotografia do céu no instante em que você nasceu, lida como símbolo. Ele descreve tendências e possibilidades, nunca fatos inevitáveis — e nada aqui substitui decisão sua, orientação de saúde, jurídica ou financeira.';
