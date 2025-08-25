// ruta: frontend/js/login.js
import { supabase } from './../supabase-client.js';
import { getUserRole } from './models/userRoles.model.js';

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.querySelector('#login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
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
                // --- LÍNEA CORREGIDA Y DEFINITIVA ---
                // Te redirige a la carpeta correcta: /pages/dashboard.html
                window.location.href = './pages/dashboard.html';
            } else {
                // Si es cliente o no tiene rol, va a la página principal
                window.location.href = 'index.html';
            }
        });
    }
});