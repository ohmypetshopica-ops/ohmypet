// --- Importa el cliente de Supabase directamente ---
import { supabase } from '../supabase-client.js';

const loginForm = document.querySelector('#login-form');
const forgotPasswordLink = document.querySelector('#forgot-password-link');

// --------------------------------------------------
// Iniciar sesión con Email y Contraseña
// --------------------------------------------------
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    // 1. Iniciar sesión del usuario
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (authError) {
        alert(`Error: ${authError.message}`);
        return;
    }

    // 2. Si el inicio de sesión es exitoso, obtener el rol del usuario
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

    if (roleError) {
        alert('Inicio de sesión exitoso, pero no pudimos verificar tu rol. Serás dirigido a la tienda.');
        window.location.href = 'index.html';
        return;
    }

    // 3. Redirigir al usuario basado en su rol
    const userRole = roleData ? roleData.role : null;

    if (userRole === 'dueno' || userRole === 'empleado') {
        alert('¡Inicio de sesión de administrador exitoso!');
        window.location.href = 'dashboard.html';
    } else {
        alert('¡Inicio de sesión exitoso!');
        window.location.href = 'index.html';
    }
});

// --------------------------------------------------
// Recuperar Contraseña
// --------------------------------------------------
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (event) => {
        event.preventDefault();
        // Redirige a la nueva página de "olvidé mi contraseña"
        window.location.href = 'forgot-password.html';
    });
}