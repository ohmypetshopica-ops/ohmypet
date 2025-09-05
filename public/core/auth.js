// Este script protege las rutas que requieren autenticación

// Importamos el cliente de supabase. OJO: la ruta es relativa al archivo HTML que lo carga.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---- RECUERDA USAR TUS PROPIAS CLAVES ----
const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función que se ejecuta automáticamente para verificar la sesión
(async () => {
    // Obtenemos la sesión actual
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // Si NO hay una sesión activa, redirigimos al usuario a la página de login
        console.log("Acceso denegado. No hay sesión activa. Redirigiendo a /");
        window.location.href = '/public/modules/login/login.html'; // Redirige a la raíz del proyecto (index.html o login.html)
    }
})();