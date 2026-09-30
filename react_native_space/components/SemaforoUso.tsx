import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
}

export function SemaforoUso({ tipo, rotulo }: Props) {
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
  // precisa ser alcançado justamente quando `uso` está nulo. O `usuarioId` é o que
  // separa o vencido de quem saiu da conta — sem perfil, `acessoDoPlano` também barra,
  // e essa pessoa leria "seu acesso terminou" sem nunca ter tido acesso. O super-admin
  // não precisa de checagem aqui: `acessoDoPlano` já o libera.
  if (usuarioId && !acesso.liberado) {
    return (
      <View style={estilos.trancado} accessibilityLabel="Acesso vencido">
        <Ionicons name="lock-closed" size={16} color={Cores.textoSecundario} />
        <Text style={estilos.trancadoTexto}>
          {mensagemDoLimite({
            permitido: false, motivo: 'vencido', usadoHoje: 0,
            limiteDia: null, venceuEm: acesso.venceuEm,
          }, tipo)}
        </Text>
      </View>
    );
  }

  if (!usuarioId || semLimite || !uso) return null;

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
});
