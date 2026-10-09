import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../constants/colors';
import { Fontes } from '../constants/typography';
import { Espacamento, RaioBorda } from '../constants/spacing';
import { useAuth } from '../contexts/AuthContext';
import { lerUsoDoDia, type TipoUso, type UsoDoDia } from '../services/usoIA';
import { acessoDoPlano, mensagemDoLimite } from '../supabase/functions/_shared/limites';

/**
 * Semáforo de uso: diz quanto de IA ainda cabe hoje, **antes** de a pessoa
 * gastar.
 *
 * O limite de verdade é o do servidor (configuracao_ia + uso_ia, conferidos
 * nas Edge Functions). Este componente só mostra o número, e desaparece
 * quando não tem número para mostrar — semáforo apagado é melhor que semáforo
 * chutando.
 *
 * Com o acesso vencido mostra um cadeado no lugar do número. Como este semáforo já
 * está em todos os lugares onde a IA é oferecida, o aviso aparece antes da pessoa
 * tocar, e não só depois que o servidor recusa.
 */

const VERDE = '#4CAF50';
const AMBAR = '#FF9800';

interface Props {
  tipo: TipoUso;
  /** Rótulo curto do que está sendo contado. */
  rotulo: string;
  /**
   * O crédito avulso da pessoa neste produto. Só informa: quem decide se a leitura sai é o
   * servidor. Quatro estados, e o quarto é a ausência:
   * - número maior que zero: no lugar do cadeado, uma faixa que diz que há leitura para usar;
   * - zero: o cadeado, como sempre;
   * - `'desconhecido'`: no lugar do cadeado, nada. Ainda não leu, ou a leitura falhou, e o
   *   cadeado afirmaria que o acesso terminou a quem pode ter acabado de pagar. Um literal, e
   *   não `null`: a diferença entre `null` e `undefined` numa prop opcional é o tipo de
   *   distinção que quebra em silêncio meses depois;
   * - ausente: o cadeado, exatamente como era. Quem não conhece compra avulsa não passa nada.
   */
  creditoAvulso?: number | 'desconhecido';
}

export function SemaforoUso({ tipo, rotulo, creditoAvulso }: Props) {
  const { perfil, sessao } = useAuth();
  const [uso, setUso] = useState<UsoDoDia | null>(null);
  const usuarioId = sessao?.user?.id ?? null;
  const plano = perfil?.plano ?? 'gratuito';
  const semLimite = perfil?.is_super_admin === true;
  // A mesma regra do servidor decide o cadeado. Se a tela decidisse por conta própria
  // existiriam duas verdades, e a que desse acesso indevido seria a que ninguém notaria.
  const acesso = acessoDoPlano(perfil?.plano_valido_ate, new Date(), semLimite);

  useEffect(() => {
    // Quem está trancado não pode usar o recurso de jeito nenhum: ler o contador do dia
    // seria uma ida ao banco para um número que a tela nem vai mostrar.
    if (!usuarioId || semLimite || !acesso.liberado) return;
    let vivo = true;
    lerUsoDoDia(usuarioId, plano, tipo).then((resultado) => {
      if (vivo) setUso(resultado);
    });
    return () => { vivo = false; };
  }, [usuarioId, plano, tipo, semLimite, acesso.liberado]);

  // Fica ANTES do `!uso`: quem venceu não tem contador para mostrar, e este retorno
  // precisa ser alcançado justamente quando `uso` está nulo. Dois guardas, e cada um
  // existe por um motivo. `usuarioId` separa o vencido de quem saiu da conta: sem
  // sessão não há ninguém para acusar. `perfil != null` separa o vencido de quem o app
  // ainda não conhece: o AuthContext define a sessão e só DEPOIS busca o perfil, então
  // esse intervalo existe em todo cold start (e dura a sessão inteira se a leitura
  // falhar, porque `buscarPerfil` devolve nulo em vez de lançar). Nos dois casos
  // `acessoDoPlano` também barra, e a pessoa leria "seu acesso terminou" sem ter
  // perdido nada. O super-admin não precisa de checagem aqui: `acessoDoPlano` já o libera.
  if (usuarioId && perfil != null && !acesso.liberado) {
    // O cadeado fala do PLANO: a validade dele acabou ou nunca existiu. Quem comprou uma
    // leitura avulsa tem um direito que não depende de plano nenhum, e a compra deixa
    // exatamente este perfil: `gratuito`, sem validade. Sem este desvio a tela diria "Seu
    // acesso terminou" logo acima do botão que funciona, na cara de quem acabou de pagar.
    //
    // Só aqui, e não no `!uso.ligado` mais abaixo: lá o servidor barra mesmo quem tem
    // crédito (recurso desligado vence o crédito, de propósito), e o aviso é verdadeiro.
    //
    // Sem saber do crédito, o semáforo não afirma nada: "semáforo apagado é melhor que
    // semáforo chutando", como o comentário do topo já diz. O cadeado seria uma afirmação
    // falsa para um comprador, e a faixa verde, outra para quem não comprou.
    if (creditoAvulso === 'desconhecido') return null;
    if (typeof creditoAvulso === 'number' && creditoAvulso > 0) {
      return (
        <View style={estilos.faixa}>
          <View style={[estilos.ponto, { backgroundColor: VERDE }]} />
          <Text style={estilos.texto}>
            {creditoAvulso === 1
              ? `${rotulo}: você tem uma leitura avulsa para usar.`
              : `${rotulo}: você tem ${creditoAvulso} leituras avulsas para usar.`}
          </Text>
        </View>
      );
    }
    return (
      // Tocável, e não só texto: até 01/10 este aviso pedia "atualize seu plano" e não
      // oferecia caminho nenhum — o app mandava agir e escondia a porta. O card da home
      // já levava aos planos; este não levava a lugar nenhum.
      <Pressable
        onPress={() => router.push('/planos')}
        accessibilityRole="button"
        accessibilityLabel="Acesso vencido"
        accessibilityHint="Abre os planos"
        style={({ pressed }) => [estilos.trancado, pressed && estilos.pressionado]}
      >
        <Ionicons name="lock-closed" size={16} color={Cores.textoSecundario} />
        <Text style={estilos.trancadoTexto}>
          {mensagemDoLimite({
            permitido: false, motivo: 'vencido', usadoHoje: 0,
            limiteDia: null, recursoLigado: true, venceuEm: acesso.venceuEm,
          }, tipo)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={Cores.textoSecundario} />
      </Pressable>
    );
  }

  if (!usuarioId || semLimite || !uso) return null;

  // `creditoAvulso` NÃO entra aqui, de propósito. Recurso desligado para o plano vence o
  // crédito no servidor (`recursoLigado`): o dono desligou, e a leitura não sai nem para
  // quem pagou. Aqui o aviso é verdadeiro, e um "você tem uma leitura" ao lado dele
  // prometeria o que o servidor vai recusar.
  if (!uso.ligado) {
    return (
      <View style={estilos.faixa}>
        <View style={[estilos.ponto, { backgroundColor: Cores.erro }]} />
        <Text style={estilos.texto}>{rotulo} não está no seu plano.</Text>
      </View>
    );
  }

  if (uso.limiteDia === null) return null;

  const restante = Math.max(0, uso.limiteDia - uso.usadoHoje);
  const cor = restante === 0 ? Cores.erro
    : restante <= Math.ceil(uso.limiteDia / 2) ? AMBAR
      : VERDE;

  return (
    <View style={estilos.faixa}>
      <View style={[estilos.ponto, { backgroundColor: cor }]} />
      <Text style={estilos.texto}>
        {restante === 0
          ? `${rotulo}: você usou as ${uso.limiteDia} de hoje. Amanhã tem mais.`
          : `${rotulo}: ${restante} de ${uso.limiteDia} ainda hoje.`}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm,
    backgroundColor: 'rgba(88, 117, 101, 0.07)',
    borderRadius: RaioBorda.md,
    paddingVertical: 8, paddingHorizontal: Espacamento.sm,
    marginBottom: Espacamento.sm,
  },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  texto: { flex: 1, fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario },
  trancado: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.xs,
    paddingVertical: Espacamento.xs,
    // A mesma margem de `faixa`: o cadeado ocupa a vaga do semáforo, e os cinco lugares
    // que o usam põem conteúdo logo abaixo. Sem ela, o estado trancado encosta no que
    // vem depois e o liberado não.
    marginBottom: Espacamento.sm,
  },
  trancadoTexto: {
    flex: 1, fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario,
  },
  pressionado: { opacity: 0.7 },
});
