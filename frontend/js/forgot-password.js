// Importa el cliente de Supabase
import { supabase } from '../supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = form.email.value;

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/ohmypet/frontend/update-password.html`,
            });

            if (error) {
                alert(`Error al enviar el correo: ${error.message}`);
            } else {
                alert('Si tu correo está registrado, recibirás un enlace para restablecer la contraseña. Por favor, revisa tu bandeja de entrada.');
            }
        });
    }
});