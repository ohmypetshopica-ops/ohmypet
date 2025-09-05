// Importamos el cliente de Supabase desde su CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---- AQUÍ VAN TUS CLAVES DE SUPABASE ----
const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima

// Creamos el cliente de Supabase que usaremos en todo el proyecto
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportamos el cliente para poder usarlo en otros archivos (como login.js)
export { supabase };