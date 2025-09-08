import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---- USA TUS CLAVES DE SUPABASE ----
const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTOS DEL DOM ---
const guestNav = document.querySelector('#guest-nav');
const userNav = document.querySelector('#user-nav');
const userProfileButton = document.querySelector('#user-profile-button');
const userProfileMenu = document.querySelector('#user-profile-menu');
const userInitialElement = document.querySelector('#user-initial');
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

        if (profile && profile.full_name) {
            // Obtenemos la primera letra del nombre
            const firstInitial = profile.full_name.charAt(0).toUpperCase();
            userInitialElement.textContent = firstInitial;
        }

    } else {
        // --- Si NO hay un usuario logueado ---
        guestNav.classList.remove('hidden');
        userNav.classList.add('hidden');
        userNav.classList.remove('flex');
    }
};

// --- MANEJO DEL LOGOUT Y MENÚ DE PERFIL ---
userProfileButton.addEventListener('click', (event) => {
    event.stopPropagation();
    userProfileMenu.classList.toggle('hidden');
});

logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error al cerrar sesión:', error);
    } else {
        window.location.reload();
    }
});

// Cierra el menú de perfil si se hace clic fuera de él
window.addEventListener('click', (event) => {
    if (!userNav.contains(event.target)) {
        userProfileMenu.classList.add('hidden');
    }
});


// --- INICIALIZACIÓN ---
// Llamamos a la función para configurar la UI cuando la página se carga
document.addEventListener('DOMContentLoaded', setupUI);