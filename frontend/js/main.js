// frontend/js/main.js
import { supabase } from '../supabase-client.js';
import { getUserRole } from './models/userRoles.model.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginLink = document.querySelector('#login-link');
    const logoutButton = document.querySelector('#logout-button');

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Usuario ha iniciado sesión.
        
        // 1. VERIFICAMOS EL ROL PARA REDIRIGIR SI ES NECESARIO
        const role = await getUserRole(session.user.id);
        const isAdminPage = window.location.pathname.includes('/pages/');

        if ((role === 'dueno' || role === 'empleado') && !isAdminPage) {
            // Si es admin Y NO está en una página de admin, lo redirigimos
            window.location.replace('./pages/dashboard.html');
            return; // Detenemos la ejecución para que la redirección ocurra
        }

        // 2. MOSTRAMOS EL BOTÓN DE LOGOUT EN PÁGINAS PÚBLICAS
        loginLink.classList.add('hidden');
        logoutButton.classList.remove('hidden');
    } else {
        // Usuario NO ha iniciado sesión
        loginLink.classList.remove('hidden');
        logoutButton.classList.add('hidden');
    }

    // 3. Añadir funcionalidad al botón de cerrar sesión
    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
        } else {
            // Al cerrar sesión, siempre volvemos a la página principal
            window.location.href = '/frontend/index.html';
        }
    });
});