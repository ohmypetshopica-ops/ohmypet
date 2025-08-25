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
                // --- SOLUCIÓN DEFINITIVA ---
                // Se construye la URL completa y correcta para que funcione en cualquier servidor.
                // En tu servidor, esto creará: "https://codearlo.com/ohmypet/frontend/pages/dashboard.html"
                const dashboardUrl = `${window.location.origin}/ohmypet/frontend/pages/dashboard.html`;
                window.location.href = dashboardUrl;

            } else {
                // Para los clientes, la redirección a index.html está bien.
                window.location.href = 'index.html';
            }
        });
    }
});