import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---- USA TUS CLAVES DE SUPABASE ----
const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTOS DEL DOM ---
const guestNav = document.querySelector('#guest-nav');
const userNav = document.querySelector('#user-nav');
const userNameSpan = document.querySelector('#user-name');
const logoutButton = document.querySelector('#logout-button');

// --- FUNCIÓN PARA ACTUALIZAR LA UI ---
const setupUI = async () => {
    // 1. Obtenemos el usuario actual
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // --- Si hay un usuario logueado ---
        guestNav.classList.add('hidden');
        userNav.classList.remove('hidden');
        userNav.classList.add('flex'); // Tailwind usa flex para alinear items

        // Buscamos su nombre en la tabla 'profiles'
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (profile) {
            userNameSpan.textContent = `Hola, ${profile.full_name}`;
        }

    } else {
        // --- Si NO hay un usuario logueado ---
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
        userNav.classList.remove('flex');
    }
};

// --- MANEJO DEL LOGOUT ---
logoutButton.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error al cerrar sesión:', error);
    } else {
        // Refrescamos la página para que la UI se actualice al estado de "invitado"
        window.location.reload();
    }
});


// --- INICIALIZACIÓN ---
// Llamamos a la función para configurar la UI cuando la página se carga
document.addEventListener('DOMContentLoaded', setupUI);


// --- INICIO: LÓGICA PARA EL SIDEBAR DESPLEGABLE ---
const menuButton = document.querySelector('#menu-button');
const sidebar = document.querySelector('#sidebar');
const overlay = document.querySelector('#overlay');

// Función para mostrar/ocultar el sidebar
const toggleSidebar = () => {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
};

// Event listeners para abrir y cerrar el menú
menuButton.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);
// --- FIN: LÓGICA PARA EL SIDEBAR ---