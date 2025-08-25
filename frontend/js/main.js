// ruta: frontend/js/main.js

import { supabase } from '../supabase-client.js';
import { getUserRole } from './models/userRoles.model.js';

// --- Función para redirigir al usuario según su rol ---
async function handleUserSession() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error('Error al obtener la sesión:', sessionError);
        return;
    }

    if (session) {
        // Si el usuario está en la página de login o registro, lo sacamos de ahí.
        if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html')) {
            window.location.href = 'index.html'; // Redirige a la página principal
            return;
        }

        // Obtenemos el rol del usuario
        const userRole = await getUserRole(session.user.id);

        // Si es dueño o empleado, lo enviamos al dashboard
        if (userRole === 'dueno' || userRole === 'empleado') {
            // Solo redirige si NO está ya en una página del dashboard
            if (!window.location.pathname.includes('/pages/')) {
                window.location.href = 'pages/dashboard.html';
            }
        }
        // Si es 'cliente' o no tiene rol, se queda en las páginas públicas (index, tienda, etc.)
    }
}


// --- Lógica para mostrar/ocultar botones y manejar logout ---
function setupUIAndLogout() {
    const loginLink = document.querySelector('#login-link');
    const logoutButton = document.querySelector('#logout-button');

    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            loginLink?.classList.add('hidden');
            logoutButton?.classList.remove('hidden');
        } else {
            loginLink?.classList.remove('hidden');
            logoutButton?.classList.add('hidden');
        }
    });

    logoutButton?.addEventListener('click', async (event) => {
        event.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
        } else {
            // Al cerrar sesión, siempre volvemos al inicio.
            window.location.href = 'index.html';
        }
    });
}


// --- Ejecutar todo al cargar la página ---
document.addEventListener('DOMContentLoaded', () => {
    handleUserSession();
    setupUIAndLogout();
});