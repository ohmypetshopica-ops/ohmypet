// frontend/js/main.js
import { supabase } from '../supabase-client.js';
import { getUserRole } from './models/userRoles.model.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginLink = document.querySelector('#login-link');
    const logoutButton = document.querySelector('#logout-button');

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Usuario ha iniciado sesión.
        const role = await getUserRole(session.user.id);
        const isAdminPage = window.location.pathname.includes('/pages/');

        if ((role === 'dueno' || role === 'empleado') && !isAdminPage) {
            // CORRECCIÓN: Usamos una ruta más directa para la redirección.
            window.location.replace('pages/dashboard.html'); 
            return; 
        }

        loginLink.classList.add('hidden');
        logoutButton.classList.remove('hidden');
    } else {
        // Usuario NO ha iniciado sesión
        loginLink.classList.remove('hidden');
        logoutButton.classList.add('hidden');
    }

    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
        } else {
            // Al cerrar sesión, volvemos a la página principal.
            window.location.href = 'index.html';
        }
    });
});