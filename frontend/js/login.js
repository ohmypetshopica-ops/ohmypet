// ruta: frontend/js/login.js
import { supabase } from './../supabase-client.js';
import { getUserRole } from './models/userRoles.model.js'; // Importamos la función para obtener el rol

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.querySelector('#login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;

            // 1. Inicia sesión del usuario
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                alert(`Error al iniciar sesión: ${error.message}`);
                return;
            }

            if (!data.user) {
                alert('No se pudo verificar el usuario. Inténtalo de nuevo.');
                return;
            }

            // 2. Si el login es exitoso, obtenemos el rol del usuario
            const role = await getUserRole(data.user.id);

            // 3. Redirigimos basado en el rol
            if (role === 'dueno' || role === 'empleado') {
                // --- LÍNEA CORREGIDA ---
                // Si es dueño o empleado, va al dashboard usando la ruta completa y correcta.
                window.location.href = '/ohmypet/frontend/pages/dashboard.html';
            } else {
                // Si es cliente o no tiene rol, va a la página principal
                window.location.href = 'index.html';
            }
        });
    }
});