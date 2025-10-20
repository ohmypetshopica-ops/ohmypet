import { supabase } from './profile.api.js';

// --- UTILITY: LIMPIEZA DE NÚMEROS DE TELÉFONO ---
const cleanPhoneNumber = (rawNumber) => {
    if (!rawNumber) return null;
    
    // 1. Eliminar todos los caracteres que no son dígitos, excepto el signo '+'
    let cleaned = rawNumber.replace(/[^\d+]/g, '');
    
    // 2. Si el número no tiene 9 dígitos exactos y no comienza con '+', se considera que le falta el formato.
    //    Si tiene más de 9 dígitos y comienza con '+', se asume formato internacional.
    //    Si tiene 9 dígitos, se asume formato local.
    if (cleaned.length < 9 || (cleaned.length > 9 && !cleaned.startsWith('+'))) {
        // Si no cumple el formato estricto de 9 dígitos locales o +código, lo consideramos inválido
        let digitsOnly = cleaned.replace(/\D/g, '');
        if (digitsOnly.length === 9) {
            return digitsOnly; // 9 dígitos locales
        }
        return null; // Inválido
    }
    
    // 3. Si tiene un '+' o tiene 9 dígitos exactos, se devuelve limpio (ej: +51987654321 o 987654321)
    return cleaned;
};
// --- FIN UTILITY ---


// --- ELEMENTOS DEL DOM ---
const editProfileForm = document.querySelector('#edit-profile-form');
const formMessage = document.querySelector('#form-message');
const profileFullName = document.querySelector('#profile-full-name');
const profileEmail = document.querySelector('#profile-email');
const userInitialSpan = document.querySelector('#user-initial');
const userAvatarImg = document.querySelector('#user-avatar-img');

// Inputs
const firstNameInput = document.querySelector('#first_name');
const lastNameInput = document.querySelector('#last_name');
const phoneInput = document.querySelector('#phone');
const districtInput = document.querySelector('#district');
const emergencyContactNameInput = document.querySelector('#emergency_contact_name');
const emergencyContactPhoneInput = document.querySelector('#emergency_contact_phone');
const avatarUrlInput = document.querySelector('#avatar_url');
const avatarSelectionContainer = document.querySelector('#avatar-selection');


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
        .select('full_name, first_name, last_name, phone, district, emergency_contact_name, emergency_contact_phone, avatar_url, doc_type, doc_num') // <-- CORRECCIÓN AQUÍ
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error al cargar el perfil:', error);
        profileFullName.textContent = 'Error al Cargar';
        profileEmail.textContent = 'Por favor, recarga la página.';
        formMessage.textContent = 'No se pudo cargar tu perfil. Revisa la consola para más detalles.';
        formMessage.className = 'p-4 rounded-md font-medium text-sm bg-red-100 text-red-700';
        formMessage.classList.remove('hidden');
        return;
    }

    if (profile) {
        const displayName = (profile.first_name && profile.last_name) 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.full_name;
        
        profileFullName.textContent = displayName || 'Usuario';
        profileEmail.textContent = user.email;

        // Mostrar avatar o inicial
        if (profile.avatar_url) {
            userAvatarImg.src = profile.avatar_url;
            userAvatarImg.classList.remove('hidden');
            userInitialSpan.classList.add('hidden');
            avatarUrlInput.value = profile.avatar_url;
            // Marcar el avatar seleccionado en la lista
            document.querySelectorAll('.avatar-option').forEach(img => {
                if (img.src === profile.avatar_url) {
                    img.classList.add('selected');
                }
            });
        } else {
            userInitialSpan.textContent = (displayName || 'U').charAt(0).toUpperCase();
            userAvatarImg.classList.add('hidden');
            userInitialSpan.classList.remove('hidden');
        }
        
        // Rellenar formulario
        phoneInput.value = profile.phone || '';
        districtInput.value = profile.district || '';
        emergencyContactNameInput.value = profile.emergency_contact_name || '';
        emergencyContactPhoneInput.value = profile.emergency_contact_phone || '';
        firstNameInput.value = profile.first_name || '';
        lastNameInput.value = profile.last_name || '';
        
        // =========== CÓDIGO AÑADIDO ===========
        // Rellenar nuevos campos de documento
        document.querySelector('#doc_type').value = profile.doc_type || 'No especificado';
        document.querySelector('#doc_num').value = profile.doc_num || 'No especificado';
        // =======================================
    }
};

// --- MANEJO DE LA SELECCIÓN DE AVATAR ---
if (avatarSelectionContainer) {
    avatarSelectionContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'IMG') {
            // Quitar selección previa
            avatarSelectionContainer.querySelectorAll('.avatar-option').forEach(img => {
                img.classList.remove('selected');
            });

            // Marcar nuevo avatar
            const selectedAvatar = event.target;
            selectedAvatar.classList.add('selected');
            
            // Actualizar vista previa y campo oculto
            const avatarUrl = selectedAvatar.src;
            userAvatarImg.src = avatarUrl;
            userAvatarImg.classList.remove('hidden');
            userInitialSpan.classList.add('hidden');
            avatarUrlInput.value = avatarUrl;
        }
    });
}


// --- MANEJO DEL FORMULARIO DE EDICIÓN ---
if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        formMessage.classList.add('hidden');
        const submitButton = editProfileForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        const phoneRaw = phoneInput.value;
        const emergencyPhoneRaw = emergencyContactPhoneInput.value;

        const phoneCleaned = cleanPhoneNumber(phoneRaw);
        const emergencyPhoneCleaned = cleanPhoneNumber(emergencyPhoneRaw);
        
        // VALIDACIÓN DE NÚMEROS DE TELÉFONO
        if (phoneRaw && phoneCleaned === null) {
            formMessage.textContent = 'Error: El número de teléfono/WhatsApp es inválido. Debe tener 9 dígitos o incluir un código de país (ej: +51 987...).';
            formMessage.className = 'p-4 rounded-md font-medium text-sm bg-red-100 text-red-700';
            formMessage.classList.remove('hidden');
            submitButton.disabled = false;
            return;
        }

        if (emergencyContactPhoneInput.value.trim() && emergencyPhoneCleaned === null) {
            formMessage.textContent = 'Error: El número de teléfono de emergencia es inválido. Debe tener 9 dígitos o incluir un código de país.';
            formMessage.className = 'p-4 rounded-md font-medium text-sm bg-red-100 text-red-700';
            formMessage.classList.remove('hidden');
            submitButton.disabled = false;
            return;
        }

        const updatedProfile = {
            first_name: firstNameInput.value.trim(),
            last_name: lastNameInput.value.trim(),
            full_name: `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`,
            phone: phoneCleaned, // Guardar el número limpio
            district: districtInput.value,
            emergency_contact_name: emergencyContactNameInput.value.trim(),
            emergency_contact_phone: emergencyPhoneCleaned, // Guardar el número limpio
            avatar_url: avatarUrlInput.value // Guardar la URL del avatar
        };

        const { error } = await supabase
            .from('profiles')
            .update(updatedProfile)
            .eq('id', currentUser.id);

        if (error) {
            formMessage.textContent = `Error: ${error.message}`;
            formMessage.className = 'p-4 rounded-md font-medium text-sm bg-red-100 text-red-700';
        } else {
            formMessage.textContent = '¡Perfil actualizado con éxito!';
            formMessage.className = 'p-4 rounded-md font-medium text-sm bg-green-100 text-green-700';
            profileFullName.textContent = updatedProfile.full_name;
        }
        
        formMessage.classList.remove('hidden');
        submitButton.disabled = false;
    });
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadUserProfile);