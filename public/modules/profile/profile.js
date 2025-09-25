// public/modules/profile/profile.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const fullNameElement = document.querySelector('#profile-full-name');
const emailElement = document.querySelector('#profile-email');
const roleElement = document.querySelector('#profile-role');
const userAvatar = document.querySelector('#user-avatar'); // El elemento img del avatar
const petsContainer = document.querySelector('#pets-container');
const petCardTemplate = document.querySelector('#pet-card-template');

// --- FUNCIÓN OPTIMIZADA PARA OBTENER DATOS ---
const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    const [profileResponse, petsResponse] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, first_name, last_name, role, avatar_url') // Pedimos la URL del avatar
            .eq('id', user.id)
            .single(),
        supabase
            .from('pets')
            .select('id, name, breed')
            .eq('owner_id', user.id)
    ]);

    const { data: profile } = profileResponse;
    const { data: pets } = petsResponse;

    if (profile) {
        const displayName = (profile.first_name && profile.last_name) 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.full_name;
            
        fullNameElement.textContent = displayName || 'No especificado';
        emailElement.textContent = user.email;
        roleElement.textContent = profile.role;

        // Mostramos el avatar si existe, si não, el placeholder con la inicial
        if (profile.avatar_url) {
            userAvatar.src = profile.avatar_url;
        } else {
            const initial = (displayName || 'U').charAt(0).toUpperCase();
            userAvatar.src = `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${initial}`;
        }
    }

    if (pets && pets.length > 0) {
        petsContainer.innerHTML = '';
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