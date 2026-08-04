import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Cores } from '../constants/colors';

interface Props {
  children: ReactNode;
}

interface Estado {
  temErro: boolean;
  erro: Error | null;
}

export class ErrorBoundary extends Component<Props, Estado> {
  constructor(props: Props) {
    super(props);
    this.state = { temErro: false, erro: null };
  }

  static getDerivedStateFromError(erro: Error): Estado {
    return { temErro: true, erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', erro, info?.componentStack);
  }

  resetar = () => {
    this.setState({ temErro: false, erro: null });
  };

  render() {
    if (this.state.temErro) {
      return (
        <View style={estilos.container}>
          <Text style={estilos.titulo}>Algo deu errado</Text>
          <Text style={estilos.mensagem}>
            {this.state.erro?.message ?? 'Erro desconhecido'}
          </Text>
          <Pressable
            onPress={this.resetar}
            style={estilos.botao}
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
          >
            <Text style={estilos.textoBotao}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Cores.fundoEscuro,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: Cores.textoClaro,
    marginBottom: 12,
  },
  mensagem: {
    fontSize: 14,
    color: Cores.textoSecundario,
    textAlign: 'center',
    marginBottom: 24,
  },
  botao: {
    backgroundColor: Cores.acento,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 44,
    minHeight: 44,
  },
  textoBotao: {
    color: Cores.fundoEscuro,
    fontWeight: '700',
    fontSize: 16,
  },
});
