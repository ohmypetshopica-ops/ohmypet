// Este script protege las rutas y verifica el ROL del usuario.

// Importamos el cliente de supabase.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---- RECUERDA USAR TUS PROPIAS CLAVES ----
const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- FUNCIÓN DE SEGURIDAD AUTOEJECUTABLE ---
const checkUserRole = async () => {
    // 1. Verificamos si hay un usuario logueado
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Si NO hay usuario, lo redirigimos al login
        console.log("Acceso denegado (sin sesión). Redirigiendo...");
        window.location.href = '/public/modules/login/login.html';
        return; // Detenemos la ejecución
    }

    // 2. Si hay usuario, buscamos su perfil para obtener su rol
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error al obtener el perfil para verificar el rol:', error);
        // Si hay un error, por seguridad, cerramos sesión y redirigimos
        await supabase.auth.signOut();
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    // 3. Verificamos si el rol es 'cliente'
    if (profile && profile.role === 'cliente') {
        // Si es un cliente, cerramos su sesión y lo redirigimos
        console.log("Acceso denegado para el rol 'cliente'. Redirigiendo...");
        await supabase.auth.signOut();
        alert('Acceso denegado. El dashboard es solo para administración.'); // Mensaje opcional
        window.location.href = '/public/modules/login/login.html';
    } else {
        // Si el rol es 'dueño' o 'empleado', no hacemos nada y permitimos que vea la página.
        console.log("Acceso permitido. Rol:", profile.role);
    }
};

// --- INICIALIZACIÓN ---
// Ejecutamos la función de seguridad al cargar el script
checkUserRole();