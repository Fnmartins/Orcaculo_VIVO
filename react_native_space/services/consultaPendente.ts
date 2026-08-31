import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseServico, type ConsultaSalvar } from './database';

const CHAVE_CONSULTA_PENDENTE = '@oraculo:consulta_pendente';

export type ConsultaPendente = Omit<ConsultaSalvar, 'usuario_id'>;

let migracaoEmAndamento: Promise<boolean> | null = null;

export async function guardarConsultaPendente(consulta: ConsultaPendente): Promise<void> {
  await AsyncStorage.setItem(CHAVE_CONSULTA_PENDENTE, JSON.stringify(consulta));
}

export function migrarConsultaPendente(usuarioId: string): Promise<boolean> {
  if (migracaoEmAndamento) return migracaoEmAndamento;

  migracaoEmAndamento = (async () => {
    const salva = await AsyncStorage.getItem(CHAVE_CONSULTA_PENDENTE);
    if (!salva) return false;

    let consulta: ConsultaPendente;
    try {
      consulta = JSON.parse(salva) as ConsultaPendente;
    } catch {
      await AsyncStorage.removeItem(CHAVE_CONSULTA_PENDENTE);
      return false;
    }

    await DatabaseServico.salvarConsulta({ ...consulta, usuario_id: usuarioId });
    await AsyncStorage.removeItem(CHAVE_CONSULTA_PENDENTE);
    return true;
  })().finally(() => {
    migracaoEmAndamento = null;
  });

  return migracaoEmAndamento;
}
