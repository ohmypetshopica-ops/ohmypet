import { supabase } from '../core/supabase.js';
import { redirectToDashboard } from '../core/redirect.js';

// --- REDIRECCIÓN INMEDIATA SI YA ESTÁ LOGUEADO ---
document.addEventListener('DOMContentLoaded', redirectToDashboard);

// --- ELEMENTOS DEL DOM ---
const clientLoginForm = document.querySelector('#client-login-form');
const errorMessage = document.querySelector('#error-message');

// --- EVENT LISTENER ---
clientLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    errorMessage.classList.add('hidden');

    const email = clientLoginForm.email.value;
    const password = clientLoginForm.password.value;

    // --- AUTENTICACIÓN CON SUPABASE ---
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    // --- MANEJO DE LA RESPUESTA ---
    if (error) {
        console.error('Error al iniciar sesión:', error.message);
        errorMessage.classList.remove('hidden');
    } else {
        console.log('Inicio de sesión de cliente exitoso:', data.user);
        // Redirigimos al dashboard de clientes, que crearemos en el siguiente paso
        window.location.href = '/public/index.html';
    }
});