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

// --- FUNCIÓN PARA OBTENER Y MOSTRAR DATOS DEL USUARIO Y SUS MASCOTAS ---
const loadUserProfile = async () => {
    // Obtenemos el usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Si hay un usuario, buscamos su perfil y sus mascotas en Supabase
        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
                full_name,
                role,
                pets (
                    id,
                    name,
                    breed
                )
            `)
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error al obtener el perfil y las mascotas:', error);
            // Mantenemos los marcadores de posición del HTML
            return;
        }

        if (profile) {
            // Actualizamos el HTML con la información del perfil
            if (fullNameElement) fullNameElement.textContent = profile.full_name || 'No especificado';
            if (emailElement) emailElement.textContent = user.email;
            if (roleElement) roleElement.textContent = profile.role;
            
            // Mostramos las mascotas del usuario usando el template
            if (petsContainer && petCardTemplate) {
                if (profile.pets && profile.pets.length > 0) {
                    petsContainer.innerHTML = ''; // Limpiamos el marcador de posición
                    profile.pets.forEach(pet => {
                        const petCard = petCardTemplate.content.cloneNode(true);
                        // Añadimos el link a la nueva página de detalles con el ID de la mascota
                        const petLink = petCard.querySelector('.pet-link');
                        petLink.href = `/public/modules/profile/pet-details.html?id=${pet.id}`;
                        petCard.querySelector('[data-pet-name]').textContent = pet.name;
                        petCard.querySelector('[data-pet-breed]').textContent = pet.breed;
                        petsContainer.appendChild(petCard);
                    });
                } else {
                    petsContainer.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Aún no tienes mascotas registradas.</p>`;
                }
            }
        }
    } else {
        // Si no hay usuario, lo redirigimos al login
        window.location.href = '/public/modules/login/login.html';
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