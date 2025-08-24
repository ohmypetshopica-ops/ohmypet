// Importa el cliente de Supabase desde la carpeta padre
import { supabase } from '../supabase-client.js';

const registerForm = document.querySelector('#register-form');

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = registerForm.name.value;
    const email = registerForm.email.value;
    const password = registerForm.password.value;
    
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                nombre: name,
            }
        }
    });

    if (error) {
        alert(`Error: ${error.message}`);
    } else {
        alert('¡Registro exitoso! Revisa tu correo para confirmar la cuenta.');
        window.location.href = 'login.html';
    }
});