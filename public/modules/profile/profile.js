// public/modules/profile/profile.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const profileInfoDiv = document.querySelector('#profile-info');
const loadingMessage = document.querySelector('#loading-message');
const fullNameElement = document.querySelector('#profile-full-name');
const emailElement = document.querySelector('#profile-email');
const roleElement = document.querySelector('#profile-role');
const logoutButton = document.querySelector('#logout-button');

// --- FUNCIÓN PARA OBTENER Y MOSTRAR DATOS DEL USUARIO ---
const loadUserProfile = async () => {
    // 1. Ocultamos el div de información y mostramos el mensaje de carga
    profileInfoDiv.classList.add('hidden');
    loadingMessage.classList.remove('hidden');

    // 2. Obtenemos el usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // 3. Si hay un usuario, buscamos su perfil en nuestra tabla "profiles"
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, role') // Pedimos solo el nombre completo y el rol
            .eq('id', user.id)         // Donde el ID coincida
            .single();                 // Esperamos solo un resultado

        if (error) {
            console.error('Error al obtener el perfil:', error);
            loadingMessage.textContent = 'No se pudo cargar el perfil.';
            return;
        }

        if (profile) {
            // 4. Actualizamos el HTML con la información del perfil
            fullNameElement.textContent = profile.full_name || 'No especificado';
            emailElement.textContent = user.email;
            roleElement.textContent = profile.role;
            
            // 5. Ocultamos el mensaje de carga y mostramos la información del perfil
            loadingMessage.classList.add('hidden');
            profileInfoDiv.classList.remove('hidden');
        }
    } else {
        // Si no hay usuario, lo redirigimos al login
        window.location.href = '/public/modules/login/client-login.html';
    }
};

// --- MANEJO DEL LOGOUT ---
logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const { error } = await supabase.auth.signOut(); // Cerramos la sesión en Supabase

    if (error) {
        console.error('Error al cerrar sesión:', error);
    } else {
        // Si el logout es exitoso, limpiamos la sesión y redirigimos
        window.location.href = '/public/index.html';
    }
});

// --- INICIALIZACIÓN ---
// Llamamos a la función para cargar los datos del perfil cuando la página se carga
document.addEventListener('DOMContentLoaded', loadUserProfile);