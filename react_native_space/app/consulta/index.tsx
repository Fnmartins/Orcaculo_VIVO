import { Redirect } from 'expo-router';

/**
 * O tarô abre direto no rito.
 *
 * Até 02/10 havia uma tela antes, `consulta/preparo`, que pedia para embaralhar e
 * cortar — gestos de enfeite, porque o sorteio só acontecia depois. Agora embaralhar e
 * cortar são o rito de verdade, em `consulta/cartas`: pedir duas vezes a mesma coisa
 * fazia a primeira parecer falsa. A própria tela antiga previa isto no comentário dela.
 */
export default function ConsultaIndex() {
  return <Redirect href="/consulta/cartas" />;
}
