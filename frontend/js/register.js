// ruta: frontend/js/register.js
import { supabase } from '../supabase-client.js';

// ---- Solución: Espera a que todo el HTML esté listo ----
document.addEventListener('DOMContentLoaded', () => {

    const registerForm = document.querySelector('#register-form');
    const googleLoginButton = document.querySelector('#google-login-btn');

    // --- Manejo del formulario de registro tradicional ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = registerForm.name.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value;

            if (!name || !email || !password) {
                alert('Por favor completa todos los campos.');
                return;
            }

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { nombre: name } }
            });

            if (error) {
                alert(`Error en registro: ${error.message}`);
            } else {
                alert('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.');
                window.location.href = 'login.html';
            }
        });
    }

    // --- Manejo del botón de registro con Google ---
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'https://codearlo.com/ohmypet/frontend/index.html',
                }
            });

            if (error) {
                alert(`Error al registrarse con Google: ${error.message}`);
            }
        });
    }

}); // <-- Fin del 'DOMContentLoaded'