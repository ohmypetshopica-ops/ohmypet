// public/modules/login/login.js

import { supabase } from './login.api.js';

// --- ELEMENTOS DEL DOM ---
const loginForm = document.querySelector('#login-form');
const errorMessage = document.querySelector('#error-message');

// --- EVENT LISTENER ---
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.classList.add('hidden');

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    // 1. Intenta iniciar sesión
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (loginError) {
        // Si las credenciales son incorrectas, muestra error y detente
        console.error('Error al iniciar sesión:', loginError.message);
        errorMessage.classList.remove('hidden');
        return;
    }

    // 2. Si el login es exitoso, busca el perfil para obtener el rol
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', loginData.user.id)
        .single();

    if (profileError) {
        console.error('Error al obtener el perfil:', profileError.message);
        errorMessage.classList.remove('hidden');
        // Por seguridad, cerramos la sesión si no se encuentra el perfil
        await supabase.auth.signOut();
        return;
    }

    // 3. Redirige según el rol
    if (profile.role === 'dueño' || profile.role === 'empleado') {
        // Si es admin o empleado, va al dashboard
        window.location.href = '/public/modules/dashboard/dashboard.html';
    } else {
        // Si es cualquier otro rol (ej. cliente), lo deslogueamos y lo mandamos al login de clientes
        console.log("Intento de acceso de un cliente al panel de admin. Redirigiendo...");
        await supabase.auth.signOut();
        window.location.href = '/public/modules/login/client-login.html';
    }
});