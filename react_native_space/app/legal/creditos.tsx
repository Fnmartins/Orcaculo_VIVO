import React from 'react';
import { PaginaLegal } from '../../components/PaginaLegal';

// Mesmo endereço das outras duas páginas legais.
const CONTATO = 'contato@arcanus.com.br';

/**
 * Créditos e licenças.
 *
 * **Nasceu de uma obrigação, não de cortesia.** Os dados de cidades e fusos vêm
 * do GeoNames, publicados sob Creative Commons Attribution 4.0, e CC BY exige
 * atribuição de quem usa. O recorte já estava em produção e o crédito não
 * aparecia em lugar nenhum que a pessoa pudesse ver — só em comentário de
 * código. O conselho de 21/09/2026 havia anotado a exigência ("crédito ao
 * GeoNames na tela ou na política") e ela ficou sem ser cumprida até aqui.
 *
 * O aviso de copyright que a licença MIT pede para as bibliotecas também mora
 * aqui, que é por isso que uma página resolve as duas coisas.
 *
 * **A arte do tarô está de fora de propósito.** O status dela é pendência de
 * parecer jurídico, e afirmar licença numa página pública antes do parecer seria
 * decidir no lugar de quem vai responder. Quando houver resposta, é uma seção a
 * mais nesta mesma lista.
 */
export default function TelaCreditos() {
  return (
    <PaginaLegal
      titulo="Créditos e Licenças"
      atualizadoEm="outubro de 2026"
      intro="O Arcanus é construído sobre o trabalho de outras pessoas. Esta página diz de quem, e sob quais condições. Parte disto é exigência das licenças que nos permitem usar esse trabalho; o resto está aqui porque dar crédito é o certo."
      secoes={[
        {
          titulo: 'Cidades, coordenadas e fusos horários',
          paragrafos: [
            'Quando você informa a cidade onde nasceu, o aplicativo precisa saber a latitude, a longitude e o fuso horário daquele lugar. Sem latitude e longitude não existe horizonte, e sem horizonte não existe ascendente nem casas.',
            'Esses dados vêm do GeoNames, uma base geográfica aberta e mantida de forma colaborativa, publicada sob a licença Creative Commons Attribution 4.0 — que permite o uso, inclusive comercial, com a condição de creditar a fonte. É o que esta seção faz.',
          ],
          links: [
            { texto: 'geonames.org', url: 'https://www.geonames.org/' },
            { texto: 'Licença Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
          ],
        },
        {
          titulo: 'As posições dos astros',
          paragrafos: [
            'As posições do Sol, da Lua e dos planetas no seu mapa são calculadas pela Astronomy Engine, biblioteca de efemérides criada por Donald Cross e publicada sob a licença MIT. Não são tabelas aproximadas nem contas de calendário: é o céu daquele instante.',
            'O cálculo acontece no seu aparelho, e não nos nossos servidores. A sua data, hora e cidade de nascimento não precisam viajar para que o mapa exista.',
            'Se havia horário de verão no dia em que você nasceu, quem responde é o banco de fusos horários do próprio sistema operacional, que guarda o histórico de cada região. O Brasil ligou e desligou horário de verão em anos diferentes e por estados diferentes, e essa é a parte que mais costuma sair errada em cálculo de mapa — por isso ela não é palpite nosso.',
          ],
          links: [
            { texto: 'Astronomy Engine, de Donald Cross', url: 'https://github.com/cosinekitty/astronomy' },
            { texto: 'Licença MIT', url: 'https://opensource.org/license/mit' },
          ],
        },
        {
          titulo: 'O aplicativo é feito de software livre',
          paragrafos: [
            'O Arcanus roda sobre React, React Native, Expo, Expo Router, a biblioteca cliente do Supabase e os ícones Ionicons, todos publicados sob a licença MIT. Sem esse trabalho, feito em aberto por muita gente, este aplicativo não existiria.',
            'Esta seção nomeia os componentes principais, e não é um inventário de cada pacote que o aplicativo carrega por dependência. Se você precisar da lista completa de licenças, escreva para o endereço no fim desta página e nós preparamos.',
          ],
        },
        {
          titulo: 'O que é nosso',
          paragrafos: [
            'Os textos das leituras, a interpretação de cada carta, signo, casa, número e odu, o desenho das telas e o código do aplicativo são nossos.',
            'Os métodos por trás das leituras, não. Tarô, numerologia, astrologia e o jogo de búzios são tradições que atravessaram séculos e não pertencem a ninguém em particular — o que cada autor escreve sobre elas, sim. A redação que você lê aqui foi escrita para este aplicativo.',
          ],
        },
        {
          titulo: 'Contato',
          paragrafos: [
            `Erro de atribuição nesta página é coisa que queremos corrigir, não defender. Se encontrou um, escreva para ${CONTATO}.`,
          ],
        },
      ]}
    />
  );
}
