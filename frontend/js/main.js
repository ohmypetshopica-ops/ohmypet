// frontend/js/main.js
import { supabase } from '../supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginLink = document.querySelector('#login-link');
    const logoutButton = document.querySelector('#logout-button');

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Si hay sesión, solo mostramos el botón de cerrar sesión.
        loginLink.classList.add('hidden');
        logoutButton.classList.remove('hidden');
    } else {
        // Usuario NO ha iniciado sesión
        loginLink.classList.remove('hidden');
        logoutButton.classList.add('hidden');
    }

    // Funcionalidad del botón de cerrar sesión
    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
        } else {
            window.location.href = 'index.html';
        }
    });
});