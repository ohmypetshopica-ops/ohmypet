// Importamos el cliente de Supabase desde el archivo centralizado
import { supabase } from '../../core/supabase.js';

// Exportamos el cliente para poder usarlo en otros archivos (como login.js)
export { supabase };