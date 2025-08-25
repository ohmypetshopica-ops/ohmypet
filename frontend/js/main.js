// frontend/js/main.js
import { supabase } from '../supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginLink = document.querySelector('#login-link');
    const logoutButton = document.querySelector('#logout-button');

    // 1. Verificar el estado de la sesión al cargar la página
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // Si hay una sesión activa, el usuario ha iniciado sesión
        loginLink.classList.add('hidden'); // Ocultar "Iniciar Sesión"
        logoutButton.classList.remove('hidden'); // Mostrar "Cerrar Sesión"
    } else {
        // Si no hay sesión, el usuario no ha iniciado sesión
        loginLink.classList.remove('hidden'); // Mostrar "Iniciar Sesión"
        logoutButton.classList.add('hidden'); // Ocultar "Cerrar Sesión"
    }

    // 2. Añadir funcionalidad al botón de cerrar sesión
    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault(); // Prevenir que el enlace recargue la página por defecto
        
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error al cerrar sesión:', error.message);
        } else {
            // Cuando la sesión se cierra correctamente, recargamos la página
            // para que la vista se actualice y muestre "Iniciar Sesión" de nuevo.
            window.location.reload();
        }
    });
});