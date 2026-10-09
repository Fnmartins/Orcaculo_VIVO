// app/pagamento/sucesso.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { Button } from '../../components/Button';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento } from '../../constants/spacing';

const PRODUTO: Record<string, { nome: string; rota: string; acao: string }> = {
  mapa: { nome: 'a leitura do seu mapa', rota: '/mapa-astral', acao: 'Ler o meu mapa' },
  vocacao: { nome: 'a leitura da sua vocação', rota: '/vocacao', acao: 'Ler a minha vocação' },
};

export default function PagamentoSucesso() {
  const params = useLocalSearchParams<{ compra?: string; oraculo?: string }>();
  // O parâmetro vem da URL, logo vem da pessoa: nada aqui confia no valor. Produto
  // desconhecido cai na versão sem nome, que é verdadeira de qualquer jeito.
  const avulso = params.compra === 'avulso';
  const chave = params.oraculo ?? '';
  // Posse própria, e não só `PRODUTO[chave]`: o dicionário herda as chaves de todo
  // objeto, e `oraculo=constructor` devolveria uma função. Ela não é nula, então um
  // `?? null` não a pega, e a tela leria "Você já pode gerar undefined" no texto e
  // no botão.
  const produto =
    avulso && Object.prototype.hasOwnProperty.call(PRODUTO, chave) ? PRODUTO[chave] : null;

  return (
    <GradientBackground>
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.conteudo}>
          <Ionicons name="checkmark-circle" size={72} color={Cores.acento} />
          <Text style={estilos.titulo}>
            {avulso ? 'Pagamento confirmado!' : 'Assinatura confirmada!'}
          </Text>
          <Text style={estilos.texto}>
            {avulso
              ? produto
                ? `Você já pode gerar ${produto.nome}. O direito de gerar vale 90 dias, e a leitura, depois de gerada, fica no seu histórico enquanto sua conta existir. Pode levar alguns segundos para o crédito aparecer.`
                : 'Você já pode gerar a leitura que comprou. O direito de gerar vale 90 dias, e a leitura, depois de gerada, fica no seu histórico enquanto sua conta existir. Pode levar alguns segundos para o crédito aparecer.'
              : 'Seu plano está sendo liberado. Pode levar alguns segundos para aparecer.'}
          </Text>
          <Button variante="primary" label={produto ? produto.acao : 'Voltar ao início'} larguraTotal
            onPress={() => router.replace(produto ? produto.rota : '/')} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const estilos = StyleSheet.create({
  safe: { flex: 1 },
  conteudo: { flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Espacamento.lg, gap: Espacamento.md },
  titulo: { fontFamily: Fontes.titulo, fontSize: 24, fontWeight: '700',
    color: Cores.textoClaro, textAlign: 'center' },
  texto: { fontFamily: Fontes.corpo, fontSize: 15, color: Cores.textoSecundario,
    textAlign: 'center', marginBottom: Espacamento.md },
});
