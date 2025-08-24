// Importar el cliente de Supabase desde la CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Tus credenciales de Supabase
const supabaseUrl = 'https://pzpjpjfpulkrfcdviyte.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cGpwamZwdWxrcmZjZHZpeXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTcyOTUsImV4cCI6MjA3MDkzMzI5NX0.nFyEqoWNgySC5g6INbwi2rPDVNda48xgygWJVmPIn60';

// Crear el cliente de Supabase y hacerlo accesible globalmente
window.supabase = createClient(supabaseUrl, supabaseKey);