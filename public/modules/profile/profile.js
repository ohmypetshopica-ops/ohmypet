// public/modules/profile/profile.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const fullNameElement = document.querySelector('#profile-full-name');
const emailElement = document.querySelector('#profile-email');
const roleElement = document.querySelector('#profile-role');
const userAvatar = document.querySelector('#user-avatar');
const petsContainer = document.querySelector('#pets-container');
const petCardTemplate = document.querySelector('#pet-card-template');
const petCardSkeletonTemplate = document.querySelector('#pet-card-skeleton-template'); // Nuevo

// --- FUNCIÓN OPTIMIZADA PARA OBTENER DATOS ---
const loadUserProfile = async () => {
    // 1. Mostrar el esqueleto de carga inmediatamente
    petsContainer.innerHTML = ''; // Limpiar
    for (let i = 0; i < 2; i++) { // Mostrar 2 esqueletos de ejemplo
        petsContainer.append(petCardSkeletonTemplate.content.cloneNode(true));
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    // 2. Cargar los datos en paralelo como antes
    const [profileResponse, petsResponse] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, first_name, last_name, role, avatar_url')
            .eq('id', user.id)
            .single(),
        supabase
            .from('pets')
            .select('id, name, breed')
            .eq('owner_id', user.id)
    ]);

    // 3. Renderizar datos del perfil
    const { data: profile } = profileResponse;
    if (profile) {
        const displayName = (profile.first_name && profile.last_name) 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.full_name;
            
        fullNameElement.textContent = displayName || 'No especificado';
        emailElement.textContent = user.email;
        roleElement.textContent = profile.role;

        if (profile.avatar_url) {
            userAvatar.src = profile.avatar_url;
        } else {
            const initial = (displayName || 'U').charAt(0).toUpperCase();
            userAvatar.src = `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${initial}`;
        }
    }

    // 4. Renderizar la lista de mascotas, reemplazando el esqueleto
    const { data: pets } = petsResponse;
    petsContainer.innerHTML = ''; // Limpiar los esqueletos
    if (pets && pets.length > 0) {
        pets.forEach(pet => {
            const petCard = petCardTemplate.content.cloneNode(true);
            petCard.querySelector('.pet-link').href = `/public/modules/profile/pet-details.html?id=${pet.id}`;
            petCard.querySelector('[data-pet-name]').textContent = pet.name;
            petCard.querySelector('[data-pet-breed]').textContent = pet.breed;
            petsContainer.appendChild(petCard);
        });
    } else {
        petsContainer.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Aún no tienes mascotas registradas.</p>`;
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadUserProfile);