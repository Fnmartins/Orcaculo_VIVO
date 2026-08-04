import { Audio } from 'expo-av';

// Sons gerados via frequências de URL pública (Web Audio API workaround)
// Para produção: substituir pelos arquivos .mp3 reais em assets/sons/
const SONS_URL: Record<string, string> = {
  // Frequências de cura / Solfeggio públicas disponíveis via URL
  cristal:     'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  bol_tibetano:'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  agua:        'https://assets.mixkit.co/active_storage/sfx/168/168-preview.mp3',
  mistico:     'https://assets.mixkit.co/active_storage/sfx/2618/2618-preview.mp3',
};

type TipoSom = keyof typeof SONS_URL;

let somAtual: Audio.Sound | null = null;
let somAtivado = true;

export const SomMistico = {
  async ativar() {
    somAtivado = true;
  },

  async desativar() {
    somAtivado = false;
    await SomMistico.parar();
  },

  estaAtivado() {
    return somAtivado;
  },

  async tocar(tipo: TipoSom = 'cristal', loop = false) {
    if (!somAtivado) return;
    try {
      await SomMistico.parar();
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: SONS_URL[tipo] },
        { shouldPlay: true, isLooping: loop, volume: 0.4 }
      );
      somAtual = sound;
    } catch {
      // Som indisponível — continua sem áudio
    }
  },

  async parar() {
    if (somAtual) {
      try {
        await somAtual.stopAsync();
        await somAtual.unloadAsync();
      } catch { /* silencioso */ }
      somAtual = null;
    }
  },

  async tocarRevelacao() {
    await SomMistico.tocar('cristal', false);
  },

  async tocarConsulta() {
    await SomMistico.tocar('mistico', true);
  },

  async tocarBuzios() {
    await SomMistico.tocar('bol_tibetano', false);
  },

  async tocarIA() {
    await SomMistico.tocar('agua', true);
  },
};
