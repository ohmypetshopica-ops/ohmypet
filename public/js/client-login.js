import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---- USA TUS CLAVES DE SUPABASE ----
const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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