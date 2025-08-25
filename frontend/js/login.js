// ruta: frontend/js/login.js

import { supabase } from '../supabase-client.js';

const loginForm = document.querySelector('#login-form');
const googleLoginButton = document.querySelector('#google-login-btn');

// --- Manejo del formulario de login tradicional ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.email.value.trim();
        const password = loginForm.password.value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(`Error al iniciar sesión: ${error.message}`);
        } else {
            // Después del login, el script de la página de destino se encargará de redirigir si es necesario.
            window.location.href = '../index.html'; 
        }
    });
}

// --- Manejo del botón de login con Google ---
if (googleLoginButton) {
    googleLoginButton.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'https://codearlo.com/ohmypet/frontend/index.html',
            }
        });

        if (error) {
            alert(`Error al iniciar sesión con Google: ${error.message}`);
        }
    });
}