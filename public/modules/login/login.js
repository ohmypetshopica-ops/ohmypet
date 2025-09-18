import { supabase } from './login.api.js';
import { redirectToDashboard } from '../../core/redirect.js';
import { recoverPassword } from './password-recovery.api.js';

// --- REDIRECCIÓN INMEDIATA SI YA ESTÁ LOGUEADO ---
document.addEventListener('DOMContentLoaded', redirectToDashboard);

// --- ELEMENTOS DEL DOM ---
const clientLoginForm = document.querySelector('#client-login-form');
const forgotPasswordForm = document.querySelector('#forgot-password-form');
const errorMessage = document.querySelector('#error-message');
const resetMessage = document.querySelector('#reset-message');
const formTitle = document.querySelector('#form-title');
const formSubtitle = document.querySelector('#form-subtitle');
const forgotPasswordLink = document.querySelector('#forgot-password-link');
const backToLoginLink = document.querySelector('#back-to-login-link');

// --- EVENT LISTENERS PARA CAMBIAR DE VISTA ---
forgotPasswordLink.addEventListener('click', () => {
    clientLoginForm.classList.add('hidden');
    forgotPasswordForm.classList.remove('hidden');
    formTitle.textContent = 'Recuperar Contraseña';
    formSubtitle.textContent = 'Ingresa tu correo electrónico para recibir un enlace de recuperación.';
    errorMessage.classList.add('hidden');
    resetMessage.classList.add('hidden');
});

backToLoginLink.addEventListener('click', () => {
    forgotPasswordForm.classList.add('hidden');
    clientLoginForm.classList.remove('hidden');
    formTitle.textContent = '¡Bienvenido de nuevo!';
    formSubtitle.textContent = 'Inicia sesión en tu cuenta para continuar.';
    resetMessage.classList.add('hidden');
});

// --- MANEJO DEL FORMULARIO DE INICIO DE SESIÓN ---
clientLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.classList.add('hidden');

    const email = clientLoginForm.email.value;
    const password = clientLoginForm.password.value;

    // 1. AUTENTICACIÓN CON SUPABASE
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Error al iniciar sesión:', error.message);
        errorMessage.classList.remove('hidden');
        return; // Detenemos si las credenciales son incorrectas
    }

    // 2. VERIFICACIÓN DEL ONBOARDING
    if (data.user) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Error al obtener el perfil:', profileError);
            // Si hay un error, por seguridad lo enviamos al inicio
            window.location.href = '/public/index.html';
            return;
        }

        // 3. REDIRECCIÓN BASADA EN EL ESTADO DEL ONBOARDING
        if (profile && profile.onboarding_completed) {
            // Si ya completó el onboarding, va a la página principal
            window.location.href = '/public/index.html';
        } else {
            // Si no, va a la página de onboarding para completar su perfil
            window.location.href = '/public/modules/profile/onboarding.html';
        }
    }
});

// --- MANEJO DEL FORMULARIO DE RECUPERACIÓN DE CONTRASEÑA ---
forgotPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetMessage.classList.add('hidden');

    const email = document.querySelector('#reset-email').value;
    
    // Aquí usamos la nueva función de API
    const { success, error } = await recoverPassword(email);

    if (success) {
        resetMessage.textContent = 'Si tu correo existe en nuestro sistema, recibirás un enlace de recuperación en breve.';
        resetMessage.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700';
    } else {
        resetMessage.textContent = 'Hubo un problema al procesar tu solicitud. Inténtalo de nuevo.';
        resetMessage.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
    }
});