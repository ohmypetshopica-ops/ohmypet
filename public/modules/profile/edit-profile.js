import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const editProfileForm = document.querySelector('#edit-profile-form');
const formMessage = document.querySelector('#form-message');
const profileFullName = document.querySelector('#profile-full-name');
const profileEmail = document.querySelector('#profile-email');
const userInitial = document.querySelector('#user-initial');

// Inputs
const firstNameInput = document.querySelector('#first_name');
const lastNameInput = document.querySelector('#last_name');
const phoneInput = document.querySelector('#phone');
const districtInput = document.querySelector('#district');
const emergencyContactNameInput = document.querySelector('#emergency_contact_name');
const emergencyContactPhoneInput = document.querySelector('#emergency_contact_phone');

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
        .select('full_name, first_name, last_name, phone, district, emergency_contact_name, emergency_contact_phone')
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
        // Rellenar cabecera
        const displayName = (profile.first_name && profile.last_name) 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.full_name;
        profileFullName.textContent = displayName || 'Usuario';
        userInitial.textContent = (displayName || 'U').charAt(0).toUpperCase();
        
        // Rellenar formulario
        firstNameInput.value = profile.first_name || '';
        lastNameInput.value = profile.last_name || '';
        phoneInput.value = profile.phone || '';
        districtInput.value = profile.district || '';
        emergencyContactNameInput.value = profile.emergency_contact_name || '';
        emergencyContactPhoneInput.value = profile.emergency_contact_phone || '';
    }
    profileEmail.textContent = user.email;
};

// --- MANEJO DEL FORMULARIO DE EDICIÓN ---
editProfileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    formMessage.classList.add('hidden');
    
    const submitButton = editProfileForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Guardando...';

    const updatedProfile = {
        first_name: firstNameInput.value.trim(),
        last_name: lastNameInput.value.trim(),
        full_name: `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`,
        phone: phoneInput.value.trim(),
        district: districtInput.value,
        emergency_contact_name: emergencyContactNameInput.value.trim(),
        emergency_contact_phone: emergencyContactPhoneInput.value.trim(),
    };

    const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', currentUser.id);

    if (error) {
        console.error('Error al actualizar el perfil:', error);
        formMessage.textContent = `Error: ${error.message}`;
        formMessage.className = 'p-4 rounded-md font-medium text-sm bg-red-100 text-red-700';
    } else {
        formMessage.textContent = '¡Perfil actualizado con éxito!';
        formMessage.className = 'p-4 rounded-md font-medium text-sm bg-green-100 text-green-700';
        // Actualizar la cabecera dinámicamente
        profileFullName.textContent = updatedProfile.full_name;
        userInitial.textContent = updatedProfile.first_name.charAt(0).toUpperCase();
    }
    
    formMessage.classList.remove('hidden');
    submitButton.disabled = false;
    submitButton.textContent = 'Guardar Cambios';
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadUserProfile);