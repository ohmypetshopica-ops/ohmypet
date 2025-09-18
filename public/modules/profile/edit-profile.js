import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const editProfileForm = document.querySelector('#edit-profile-form');
const fullNameInput = document.querySelector('#full_name');
const emailInput = document.querySelector('#email');
const formMessage = document.querySelector('#form-message');

let currentUser = null;

// --- FUNCIÓN PARA CARGAR DATOS DEL USUARIO ---
const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }
    currentUser = user;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error al cargar el perfil:', error);
        formMessage.textContent = 'No se pudo cargar tu perfil.';
        formMessage.className = 'p-4 rounded-md font-medium text-sm bg-red-100 text-red-700';
        formMessage.classList.remove('hidden');
        return;
    }

    if (profile) {
        fullNameInput.value = profile.full_name || '';
    }
    emailInput.value = user.email;
};

// --- MANEJO DEL FORMULARIO DE EDICIÓN ---
editProfileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    formMessage.classList.add('hidden');

    const newFullName = fullNameInput.value.trim();

    if (!newFullName) {
        formMessage.textContent = 'El nombre no puede estar vacío.';
        formMessage.className = 'p-4 rounded-md font-medium text-sm bg-red-100 text-red-700';
        formMessage.classList.remove('hidden');
        return;
    }

    const { error } = await supabase
        .from('profiles')
        .update({ full_name: newFullName })
        .eq('id', currentUser.id);

    if (error) {
        console.error('Error al actualizar el perfil:', error);
        formMessage.textContent = `Error: ${error.message}`;
        formMessage.className = 'p-4 rounded-md font-medium text-sm bg-red-100 text-red-700';
    } else {
        formMessage.textContent = '¡Perfil actualizado con éxito!';
        formMessage.className = 'p-4 rounded-md font-medium text-sm bg-green-100 text-green-700';
    }
    formMessage.classList.remove('hidden');
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadUserProfile);