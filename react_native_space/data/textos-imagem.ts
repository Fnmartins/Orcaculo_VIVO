/**
 * Textos fixos da leitura por imagem — os que desarmam o que o leitor já traz.
 *
 * Irmão de `textos-mapa.ts`, e existe pela mesma razão que `TEXTO_RETROGRADO`
 * existe lá: há crenças que a pessoa chega com elas prontas, e o app não
 * precisa dizer nada para que ela conclua sozinha.
 *
 * **Proibir o modelo não é o mesmo que desarmar o leitor.** O prompt da
 * `ia-oraculo` já proíbe prognóstico de saúde, e o modelo obedece. Mas quem lê
 * "Linha da vida: traçado curto" conclui uma coisa que o app nunca escreveu, e
 * é o silêncio dele que deixa a conclusão de pé. A auditoria de 05/10/2026
 * achou esta lacuna: seção chamada "Linha da vida", nenhum texto em lugar
 * nenhum explicando o que ela não é.
 *
 * Por isso estes textos são do APP e não da IA: resposta gerada muda a cada
 * leitura, e o desarme não pode depender de o modelo ter lembrado dele.
 */

/**
 * A crença mais comum sobre quiromancia, e a única capaz de assustar de
 * verdade. A literatura é unânime: a linha fala de vitalidade, não de duração.
 */
export const TEXTO_LINHA_DA_VIDA = 'A linha da vida não mede quanto tempo você vive — '
  + 'isso é a confusão mais comum sobre ela, e vem do nome. O que ela descreve é '
  + 'vitalidade: como você gasta e repõe energia. Linha curta ou fina não é vida curta; '
  + 'costuma falar de quem se cansa mais rápido ou se esvazia no convívio. Nada nesta '
  + 'leitura diz nada sobre a sua saúde, e quem fala disso é profissional de saúde.';

/**
 * Ler só a mão dominante é escolha, como Placidus no mapa e a tabela pitagórica
 * na numerologia. O que falta sempre não é a ressalva: é declarar a escolha.
 */
export const TEXTO_MAO_DOMINANTE = 'Esta leitura é da mão dominante, a que você usa para '
  + 'escrever. Na tradição ela mostra o que você fez de si; a outra mão guarda o que veio '
  + 'de herança e de berço, e muitos leitores usam as duas para comparar. Ler uma só é '
  + 'escolha nossa, não a única forma de ler.';
