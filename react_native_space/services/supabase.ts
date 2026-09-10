import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const ehWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// Lido ANTES do createClient: o supabase-js limpa o hash da URL ao consumir o token.
export const chegouPorRecuperacaoDeSenha =
  ehWeb && window.location.hash.includes('type=recovery');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Na web, o token dos links de e-mail (ex.: recuperar senha) chega no hash da URL.
    detectSessionInUrl: ehWeb,
  },
});
