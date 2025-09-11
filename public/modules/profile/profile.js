// public/modules/profile/profile.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const profileContainer = document.querySelector('#profile-container');
const fullNameElement = document.querySelector('#profile-full-name');
const emailElement = document.querySelector('#profile-email');
const roleElement = document.querySelector('#profile-role');
const petsContainer = document.querySelector('#pets-container');
const petCardTemplate = document.querySelector('#pet-card-template');
const logoutButton = document.querySelector('#logout-button');

// --- FUNCIÓN OPTIMIZADA PARA OBTENER DATOS ---
const loadUserProfile = async () => {
    // 1. Obtenemos el usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        // Si no hay usuario, lo redirigimos al login
        console.error('Usuario no autenticado, redirigiendo...', userError);
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    // 2. Ejecutamos las consultas de perfil y mascotas EN PARALELO
    const [profileResponse, petsResponse] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single(),
        supabase
            .from('pets')
            .select('id, name, breed')
            .eq('owner_id', user.id)
    ]);

    // 3. Manejamos los resultados de las consultas
    const { data: profile, error: profileError } = profileResponse;
    const { data: pets, error: petsError } = petsResponse;

    if (profileError) {
        console.error('Error al obtener el perfil:', profileError);
        // Dejamos los valores por defecto si falla
    }

    if (petsError) {
        console.error('Error al obtener las mascotas:', petsError);
    }

    // 4. Actualizamos el HTML con toda la información a la vez
    if (profile) {
        if (fullNameElement) fullNameElement.textContent = profile.full_name || 'No especificado';
        if (emailElement) emailElement.textContent = user.email;
        if (roleElement) roleElement.textContent = profile.role;
    }

    if (petsContainer && petCardTemplate) {
        if (pets && pets.length > 0) {
            petsContainer.innerHTML = ''; // Limpiamos el marcador de posición
            pets.forEach(pet => {
                const petCard = petCardTemplate.content.cloneNode(true);
                const petLink = petCard.querySelector('.pet-link');
                petLink.href = `/public/modules/profile/pet-details.html?id=${pet.id}`;
                petCard.querySelector('[data-pet-name]').textContent = pet.name;
                petCard.querySelector('[data-pet-breed]').textContent = pet.breed;
                petsContainer.appendChild(petCard);
            });
        } else {
            // Si no hay mascotas o hubo un error, se muestra el mensaje por defecto.
            petsContainer.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Aún no tienes mascotas registradas.</p>`;
        }
    }
};

// --- MANEJO DEL LOGOUT ---
if (logoutButton) {
    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error);
        } else {
            window.location.href = '/public/index.html';
        }
    });
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadUserProfile);