import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const updatePasswordForm = document.querySelector('#update-password-form');
const formMessage = document.querySelector('#form-message');

// --- MANEJO DEL FORMULARIO ---
updatePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    formMessage.classList.add('hidden');

    const newPassword = updatePasswordForm.password.value;
    const confirmPassword = updatePasswordForm['confirm-password'].value;

    if (newPassword !== confirmPassword) {
        formMessage.textContent = 'Las contraseñas no coinciden.';
        formMessage.className = 'block mb-6 p-4 rounded-md bg-red-100 text-red-700';
        return;
    }
    
    // Método de Supabase para actualizar la contraseña del usuario logueado
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        console.error('Error al actualizar la contraseña:', error);
        formMessage.textContent = `Error: ${error.message}`;
        formMessage.className = 'block mb-6 p-4 rounded-md bg-red-100 text-red-700';
    } else {
        formMessage.textContent = '¡Contraseña actualizada con éxito! Serás redirigido al inicio.';
        formMessage.className = 'block mb-6 p-4 rounded-md bg-green-100 text-green-700';
        // Redirige al usuario después de 3 segundos
        setTimeout(() => {
            window.location.href = '/public/index.html';
        }, 3000);
    }
});