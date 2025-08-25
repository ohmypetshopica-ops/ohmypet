// ruta: frontend/js/login.js
import { supabase } from '../supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.querySelector('#login-form');
    const googleLoginButton = document.querySelector('#google-login-btn');

    // --- Manejo del formulario de login tradicional ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;

            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                alert(`Error al iniciar sesión: ${error.message}`);
            } else {
                // CORRECCIÓN: Se cambió la ruta para que sea relativa a la página actual.
                // Esto te enviará a index.html dentro de la carpeta frontend.
                window.location.href = 'index.html'; 
            }
        });
    }

    // --- Manejo del botón de login con Google ---
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', async () => {
            const { data,error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/ohmypet/frontend/index.html`
                }
            });

            if (error) {
                alert(`Error al iniciar sesión con Google: ${error.message}`);
            }
        });
    }

});