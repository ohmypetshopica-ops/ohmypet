import { supabase } from '../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const registerForm = document.querySelector('#register-form');
const formMessage = document.querySelector('#form-message');

// --- FUNCIÓN PARA MOSTRAR MENSAJES ---
const showMessage = (message, type = 'error') => {
    formMessage.textContent = message;
    if (type === 'error') {
        formMessage.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700 font-medium';
    } else {
        formMessage.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700 font-medium';
    }
    formMessage.classList.remove('hidden');
};

// --- EVENT LISTENER ---
registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Ocultamos mensajes previos
    formMessage.classList.add('hidden');

    // Obtenemos los valores de los campos
    const firstName = registerForm.first_name.value;
    const lastName = registerForm.last_name.value;
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    const fullName = `${firstName} ${lastName}`;

    // --- MEJORA ---
    // Validación explícita para la contraseña.
    if (password.length < 6) {
        showMessage('Error: La contraseña debe tener al menos 6 caracteres.');
        return; // Detenemos la ejecución si la contraseña es muy corta
    }

    // --- REGISTRO CON SUPABASE ---
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: fullName
            }
        }
    });

    // --- MANEJO DE LA RESPUESTA MEJORADO ---
    if (error) {
        console.error('Error en el registro:', error.message);
        // Mostramos un mensaje más específico al usuario
        if (error.message.includes('User already registered')) {
            showMessage('Error: Ya existe una cuenta con este correo electrónico.');
        } else {
            showMessage(`Error: ${error.message}`);
        }
    } else {
        // --- CORRECCIÓN: ACTUALIZAR EL PERFIL CON EL EMAIL ---
        if (data.user) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ email: email })
                .eq('id', data.user.id);

            if (updateError) {
                console.error('Error al guardar el email en el perfil:', updateError.message);
                // Informar al usuario de un problema menor no crítico
                showMessage('Registro casi completo. Hubo un problema menor al guardar tu email en el perfil, pero puedes continuar.', 'success');
            }
        }
        // --- FIN DE LA CORRECCIÓN ---

        console.log('Registro exitoso:', data.user);
        showMessage('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.', 'success');
        registerForm.reset(); // Limpiamos el formulario
    }
});

// **** INICIO DE LA NUEVA FUNCIONALIDAD ****
// --- ELEMENTOS DEL DOM (AÑADIDOS PARA VISIBILIDAD) ---
const passwordInput = document.querySelector('#password');
const toggleButton = document.querySelector('#toggle-password-visibility');
const eyeIcon = document.querySelector('#eye-icon');
const eyeSlashIcon = document.querySelector('#eye-slash-icon');

// --- LÓGICA PARA MOSTRAR/OCULTAR CONTRASEÑA (AÑADIDO) ---
if (toggleButton && passwordInput && eyeIcon && eyeSlashIcon) {
    toggleButton.addEventListener('click', () => {
        // Comprueba si el tipo de input es 'password'
        const isPassword = passwordInput.type === 'password';
        
        // Cambia el tipo de input
        passwordInput.type = isPassword ? 'text' : 'password';
        
        // Alterna la visibilidad de los iconos
        eyeIcon.classList.toggle('hidden', isPassword);
        eyeSlashIcon.classList.toggle('hidden', !isPassword);
    });
}
// **** FIN DE LA NUEVA FUNCIONALIDAD ****