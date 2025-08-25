// ruta: frontend/js/login.js

// --- CORRECCIÓN DE IMPORTACIÓN ---
// Usamos la ruta completa desde la raíz para asegurar que encuentre el archivo del cliente de Supabase.
import { supabase } from '/ohmypet/frontend/supabase-client.js';
import { getUserRole } from './models/userRoles.model.js';

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.querySelector('#login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            // Previene el comportamiento por defecto del formulario (que es lo que te pasa ahora)
            e.preventDefault();
            
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                alert(`Error al iniciar sesión: ${error.message}`);
                return;
            }

            if (!data.user) {
                alert('No se pudo verificar el usuario. Inténtalo de nuevo.');
                return;
            }

            const role = await getUserRole(data.user.id);

            if (role === 'dueno' || role === 'empleado') {
                // --- CORRECCIÓN DE REDIRECCIÓN ---
                // Se construye la URL completa para que funcione en cualquier servidor.
                const dashboardUrl = `${window.location.origin}/ohmypet/frontend/pages/dashboard.html`;
                window.location.href = dashboardUrl;

            } else {
                window.location.href = 'index.html';
            }
        });
    }
});