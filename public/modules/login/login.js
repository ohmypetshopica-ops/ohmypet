// Importamos el cliente de Supabase que creamos en login.api.js
import { supabase } from './login.api.js';

// --- ELEMENTOS DEL DOM ---
// Obtenemos el formulario y el contenedor del mensaje de error
const loginForm = document.querySelector('#login-form');
const errorMessage = document.querySelector('#error-message');

// --- EVENT LISTENER ---
// Añadimos un 'escuchador' al formulario para cuando el usuario intente enviarlo
loginForm.addEventListener('submit', async (event) => {
    // Prevenimos el comportamiento por defecto del formulario (que es recargar la página)
    event.preventDefault();

    // Ocultamos cualquier mensaje de error previo
    errorMessage.classList.add('hidden');

    // Obtenemos los valores de los campos de email y contraseña
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    // --- AUTENTICACIÓN CON SUPABASE ---
    // Usamos el método signInWithPassword de Supabase para intentar iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    // --- MANEJO DE LA RESPUESTA ---
    if (error) {
        // Si Supabase devuelve un error, lo mostramos
        console.error('Error al iniciar sesión:', error.message);
        errorMessage.classList.remove('hidden'); // Mostramos el div de error
    } else {
        // Si el inicio de sesión es exitoso, redirigimos al dashboard
        console.log('Inicio de sesión exitoso:', data.user);
        window.location.href = '/public/modules/dashboard/dashboard.html'; // Redirige a la página principal
    }
});