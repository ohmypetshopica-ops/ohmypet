import { supabase } from '../core/supabase.js';

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

    // --- MEJORA ---
    // Añadimos una validación explícita para la contraseña.
    if (password.length < 6) {
        formMessage.textContent = 'Error: La contraseña debe tener al menos 6 caracteres.';
        formMessage.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        return; // Detenemos la ejecución si la contraseña es muy corta
    }

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