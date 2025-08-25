// ruta: frontend/js/login.js

import { supabase } from '../supabase-client.js';

// NOTA: El archivo original 'login.js' contenía código de registro.
// Este es el código corregido que debería tener para el login.
const loginForm = document.querySelector('#login-form');
const googleLoginButton = document.querySelector('#google-login-btn');

// --- Manejo del formulario de login tradicional ---
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
        console.error(error);
    } else {
        // Redirige al dashboard o a la página principal tras un login exitoso.
        window.location.href = 'pages/dashboard.html';
    }
});

// --- Manejo del botón de login con Google ---
googleLoginButton.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // Asegúrate de que esta URL coincida con tu configuración
            redirectTo: new URL('index.html', window.location.href).href,
        }
    });

    if (error) {
        alert(`Error al iniciar sesión con Google: ${error.message}`);
        console.error('Error detallado:', error);
    }
});