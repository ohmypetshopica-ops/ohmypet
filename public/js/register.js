import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ---- USA TUS CLAVES DE SUPABASE ----
const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTOS DEL DOM ---
const registerForm = document.querySelector('#register-form');
const formMessage = document.querySelector('#form-message');

// --- EVENT LISTENER ---
registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Ocultamos mensajes previos
    formMessage.classList.add('hidden');

    // Obtenemos los valores de los campos
    const fullName = registerForm.full_name.value;
    const email = registerForm.email.value;
    const password = registerForm.password.value;

    // --- REGISTRO CON SUPABASE ---
    // Usamos el método signUp de Supabase
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                // Pasamos el nombre completo en la metadata
                // El trigger en la base de datos lo usará
                full_name: fullName 
            }
        }
    });

    // --- MANEJO DE LA RESPUESTA ---
    if (error) {
        console.error('Error en el registro:', error.message);
        formMessage.textContent = `Error: ${error.message}`;
        formMessage.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
    } else {
        console.log('Registro exitoso:', data.user);
        formMessage.textContent = '¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.';
        formMessage.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700';
        registerForm.reset(); // Limpiamos el formulario
    }
});