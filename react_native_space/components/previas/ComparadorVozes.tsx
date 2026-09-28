import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Cores } from '../../constants/colors';
import { Fontes } from '../../constants/typography';
import { Espacamento, RaioBorda } from '../../constants/spacing';
import { useAuth } from '../../contexts/AuthContext';
import {
  apagarVoto, listarAmostras, listarVotos, resumirVotos, salvarVoto,
  type AmostraVoz, type VotoVoz,
} from '../../services/vozes';
import { mostrarAlerta } from '../../utils/alerta';

/**
 * Ouvir as vozes candidatas e dar nota, dentro do Painel.
 *
 * Mora aqui, e não numa página de fora, pelo motivo que o `index.tsx` deste
 * diretório já registrava sobre a prévia da mesa de búzios: decidir por link
 * que o sócio não abre é o mesmo que não mostrar nada. A votação só vale se as
 * duas pessoas conseguirem votar de onde já estão logadas.
 *
 * Cada um vê a própria nota nas estrelas e a do outro ao lado. O pódio em cima
 * é a leitura rápida: média, e quantos votaram.
 */

const ESTRELAS = [1, 2, 3, 4, 5];

export function ComparadorVozes() {
  const { sessao } = useAuth();
  const meuId = sessao?.user?.id ?? null;

  const [amostras, setAmostras] = useState<AmostraVoz[] | null>(null);
  const [votos, setVotos] = useState<VotoVoz[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [tocando, setTocando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  // O som fica numa ref, e não no estado: trocar de faixa não pode depender de
  // um novo render para descarregar o anterior, senão dois tocam juntos.
  const som = useRef<Audio.Sound | null>(null);

  const pararSom = useCallback(async () => {
    const atual = som.current;
    som.current = null;
    setTocando(null);
    if (atual) {
      try {
        await atual.unloadAsync();
      } catch {
        // Já descarregado, ou a tela saiu antes. Não há o que fazer nem o que
        // dizer: o objetivo era o som parar, e ele parou.
      }
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    Promise.all([listarAmostras(), listarVotos()])
      .then(([listaAmostras, listaVotos]) => {
        if (!vivo) return;
        setAmostras(listaAmostras);
        setVotos(listaVotos);
      })
      .catch(() => {
        if (!vivo) return;
        setErro('Não foi possível carregar as amostras de voz.');
        setAmostras([]);
      });
    return () => { vivo = false; };
  }, []);

  // Sair da tela com áudio tocando deixaria a voz falando por cima do resto do
  // Painel, sem nada visível para pausá-la.
  useEffect(() => () => { void pararSom(); }, [pararSom]);

  async function alternarSom(amostra: AmostraVoz) {
    if (tocando === amostra.id) {
      await pararSom();
      return;
    }
    await pararSom();
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: amostra.url }, { shouldPlay: true });
      som.current = sound;
      setTocando(amostra.id);
      sound.setOnPlaybackStatusUpdate((estado) => {
        if ('didJustFinish' in estado && estado.didJustFinish) void pararSom();
      });
    } catch {
      mostrarAlerta('Não deu para tocar', 'A amostra não carregou. Tente de novo.');
      await pararSom();
    }
  }

  async function votar(amostra: AmostraVoz, nota: number) {
    if (!meuId) return;
    const minhaAtual = votos.find((v) => v.voz === amostra.id && v.usuario_id === meuId);
    const limpar = minhaAtual?.nota === nota;

    // Mexe na tela primeiro; se a gravação falhar, volta ao que era. Estrela
    // que só acende depois da rede parece quebrada.
    const antes = votos;
    setVotos((atual) => {
      const semAMinha = atual.filter((v) => !(v.voz === amostra.id && v.usuario_id === meuId));
      return limpar ? semAMinha : [...semAMinha, { voz: amostra.id, usuario_id: meuId, nota }];
    });
    setSalvando(amostra.id);
    try {
      if (limpar) await apagarVoto(amostra.id, meuId);
      else await salvarVoto(amostra.id, meuId, nota);
    } catch (e) {
      setVotos(antes);
      mostrarAlerta('Não foi possível salvar', e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(null);
    }
  }

  if (!amostras) {
    return <ActivityIndicator style={{ marginVertical: Espacamento.lg }} color={Cores.acento} />;
  }

  if (erro) return <Text style={estilos.erro}>{erro}</Text>;

  if (amostras.length === 0) {
    return (
      <Text style={estilos.erro}>
        Nenhuma amostra no bucket de vozes ainda. Depois de enviar os arquivos elas
        aparecem aqui sozinhas — a lista é o próprio bucket.
      </Text>
    );
  }

  const podio = resumirVotos(votos).slice(0, 5);
  const nomePorId = new Map(amostras.map((a) => [a.id, `${a.nome} (${a.marca})`]));

  return (
    <View style={estilos.bloco}>
      <Text style={estilos.ajuda}>
        Todas leem o mesmo trecho. Dê de 1 a 5 estrelas; clicar de novo na mesma
        estrela limpa a sua nota. Cada um vê a nota do outro ao lado.
      </Text>

      {podio.length > 0 ? (
        <View style={estilos.podio}>
          <Text style={estilos.rotulo}>Mais bem votadas</Text>
          {podio.map((p, i) => (
            <View key={p.voz} style={estilos.podioLinha}>
              <Text style={estilos.podioPos}>{i + 1}</Text>
              <Text style={estilos.podioNome}>{nomePorId.get(p.voz) ?? p.voz}</Text>
              <Text style={estilos.podioMedia}>{p.media.toFixed(1)}</Text>
              <Text style={estilos.podioQuantos}>
                {p.quantos === 1 ? '1 voto' : `${p.quantos} votos`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {amostras.map((a) => {
        const minha = votos.find((v) => v.voz === a.id && v.usuario_id === meuId)?.nota ?? 0;
        const dosOutros = votos
          .filter((v) => v.voz === a.id && v.usuario_id !== meuId)
          .map((v) => v.nota);

        return (
          <View key={a.id} style={estilos.voz}>
            <Pressable
              onPress={() => { void alternarSom(a); }}
              accessibilityRole="button"
              accessibilityLabel={tocando === a.id ? `Parar ${a.nome}` : `Ouvir ${a.nome}`}
              style={[estilos.tocar, tocando === a.id && estilos.tocando]}
            >
              <Ionicons
                name={tocando === a.id ? 'pause' : 'play'}
                size={16}
                color={Cores.superficie}
              />
            </Pressable>

            <View style={estilos.identidade}>
              <Text style={estilos.nome}>{a.nome}</Text>
              <Text style={estilos.marca}>{a.marca}</Text>
            </View>

            <View style={estilos.estrelas}>
              {ESTRELAS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => { void votar(a, n); }}
                  disabled={!meuId || salvando === a.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} de 5 para ${a.nome}`}
                  hitSlop={4}
                >
                  <Text style={[estilos.estrela, !meuId && estilos.estrelaTravada]}>
                    {n <= minha ? '★' : '☆'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={estilos.outros}>
              {dosOutros.length > 0 ? dosOutros.join(', ') : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: Espacamento.xs },
  ajuda: {
    fontFamily: Fontes.corpo, fontSize: 13, color: Cores.textoSecundario,
    marginBottom: Espacamento.xs,
  },
  erro: { fontFamily: Fontes.corpo, fontSize: 13, color: Cores.erro },
  rotulo: {
    fontFamily: Fontes.corpoSemibold, fontSize: 11, letterSpacing: 1.2,
    textTransform: 'uppercase', color: Cores.acento, marginBottom: 4,
  },
  podio: {
    backgroundColor: Cores.cardFundo, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda,
    padding: Espacamento.sm, marginBottom: Espacamento.sm, gap: 3,
  },
  podioLinha: { flexDirection: 'row', alignItems: 'baseline', gap: Espacamento.xs },
  podioPos: { fontFamily: Fontes.corpoNegrito, fontSize: 13, color: Cores.acento, width: 16 },
  podioNome: { flex: 1, fontFamily: Fontes.corpoSemibold, fontSize: 13, color: Cores.textoClaro },
  podioMedia: { fontFamily: Fontes.corpoNegrito, fontSize: 13, color: Cores.acento },
  podioQuantos: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario },
  voz: {
    flexDirection: 'row', alignItems: 'center', gap: Espacamento.sm,
    backgroundColor: Cores.cardFundo, borderRadius: RaioBorda.md,
    borderWidth: 1, borderColor: Cores.cardBorda,
    paddingHorizontal: Espacamento.sm, paddingVertical: 8, marginBottom: 6,
  },
  tocar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Cores.primaria,
    alignItems: 'center', justifyContent: 'center',
  },
  tocando: { backgroundColor: Cores.acento },
  identidade: { flex: 1, minWidth: 0 },
  nome: { fontFamily: Fontes.corpoSemibold, fontSize: 14, color: Cores.textoClaro },
  marca: { fontFamily: Fontes.corpo, fontSize: 11, color: Cores.textoSecundario },
  estrelas: { flexDirection: 'row', gap: 1 },
  estrela: { fontSize: 18, color: Cores.acento, paddingHorizontal: 1 },
  estrelaTravada: { opacity: 0.4 },
  outros: {
    fontFamily: Fontes.corpo, fontSize: 12, color: Cores.textoSecundario,
    minWidth: 34, textAlign: 'right',
  },
});
