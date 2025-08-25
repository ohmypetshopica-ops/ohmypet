// frontend/js/register.js
import { supabase } from '../supabase-client.js';

const registerForm = document.querySelector('#register-form');
const googleLoginButton = document.querySelector('#google-login-btn');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = registerForm.name.value.trim();
    const email = registerForm.email.value.trim();
    const password = registerForm.password.value;

    if (!name || !email || !password) {
        alert('Por favor completa todos los campos.');
        return;
    }

    const { data, error } = await supabase.auth.signUp({
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

googleLoginButton.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // CORRECCIÓN: Esta forma de construir la URL es más segura
            redirectTo: new URL('index.html', window.location.href).href,
        }
    });

    if (error) {
        alert(`Error al registrarse con Google: ${error.message}`);
    }
});