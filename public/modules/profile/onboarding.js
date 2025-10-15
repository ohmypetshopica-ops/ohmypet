import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const onboardingForm = document.querySelector('#onboarding-form');
const steps = document.querySelectorAll('.step');
const nextButtons = document.querySelectorAll('.next-btn');
const prevButtons = document.querySelectorAll('.prev-btn');
const progressBar = document.querySelector('#progress-bar');
const formTitle = document.querySelector('#form-title');
const formSubtitle = document.querySelector('#form-subtitle');
const avatarSelection = document.querySelector('#avatar-selection');
const avatarUrlInput = document.querySelector('#avatar_url');

// --- ESTADO DEL FORMULARIO ---
let currentStep = 1;
const totalSteps = 4;
const onboardingData = {};
let currentUser = null;

const formTitles = ["Crea tu perfil", "Documento de Identidad", "Datos de contacto", "Contacto de emergencia"];
const formSubtitles = ["Cuéntanos un poco sobre ti.", "Necesitamos esta información para verificarte.", "Necesitamos estos datos para coordinar los servicios.", "Es importante en caso no podamos contactarte."];

// --- FUNCIONES DE NAVEGACIÓN ---
const showStep = (stepNumber) => {
    steps.forEach(step => step.classList.add('hidden'));
    document.querySelector(`#step-${stepNumber}`).classList.remove('hidden');
    
    const progress = (stepNumber / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    formTitle.textContent = formTitles[stepNumber - 1];
    formSubtitle.textContent = formSubtitles[stepNumber - 1];
    currentStep = stepNumber;
};

const validateStep = (stepNumber) => {
    const currentStepElement = document.querySelector(`#step-${stepNumber}`);
    const inputs = currentStepElement.querySelectorAll('input[required], select[required]');
    for (const input of inputs) {
        if (!input.value.trim()) {
            alert(`Por favor, completa todos los campos requeridos.`);
            input.focus();
            return false;
        }
    }
    return true;
};

const collectStepData = (stepNumber) => {
    const currentStepElement = document.querySelector(`#step-${stepNumber}`);
    const inputs = currentStepElement.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.name) {
            onboardingData[input.name] = input.value.trim();
        }
    });
};

// --- MANEJO DE SELECCIÓN DE AVATAR ---
if (avatarSelection) {
    avatarSelection.addEventListener('click', (event) => {
        if (event.target.tagName === 'IMG' && event.target.classList.contains('avatar-option')) {
            // Quitar selección previa
            avatarSelection.querySelectorAll('.avatar-option').forEach(img => {
                img.classList.remove('selected');
            });

            // Marcar nuevo avatar
            event.target.classList.add('selected');
            avatarUrlInput.value = event.target.src;
        }
    });
}

// --- LÓGICA PRINCIPAL ---
const initializeOnboarding = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }
    currentUser = user;

    // Cargar datos desde raw_user_meta_data (del registro)
    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, doc_type, doc_num, phone, district, emergency_contact_name, emergency_contact_phone, avatar_url')
        .eq('id', user.id)
        .single();

    if (profile) {
        // Si ya tiene datos en profiles, usarlos
        document.querySelector('#first_name').value = profile.first_name || '';
        document.querySelector('#last_name').value = profile.last_name || '';
        document.querySelector('#doc_type').value = profile.doc_type || '';
        document.querySelector('#doc_num').value = profile.doc_num || '';
        document.querySelector('#phone').value = profile.phone || '';
        document.querySelector('#district').value = profile.district || '';
        document.querySelector('#emergency_contact_name').value = profile.emergency_contact_name || '';
        document.querySelector('#emergency_contact_phone').value = profile.emergency_contact_phone || '';
        
        if (profile.avatar_url) {
             avatarUrlInput.value = profile.avatar_url;
             document.querySelectorAll('.avatar-option').forEach(img => {
                if (img.src === profile.avatar_url) {
                    img.classList.add('selected');
                }
            });
        }

    } else if (user.user_metadata) {
        // Si no, usar metadata del registro
        document.querySelector('#first_name').value = user.user_metadata.first_name || '';
        document.querySelector('#last_name').value = user.user_metadata.last_name || '';
    }
};

// --- EVENT LISTENERS ---
nextButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            collectStepData(currentStep);
            if (currentStep < totalSteps) {
                showStep(currentStep + 1);
            }
        }
    });
});

prevButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (currentStep > 1) {
            showStep(currentStep - 1);
        }
    });
});

onboardingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateStep(currentStep)) return;
    
    collectStepData(currentStep);

    // Obtener email del usuario de la sesión
    const userEmail = currentUser.email;

    const finalData = {
        ...onboardingData,
        email: userEmail, // Agregamos el email a los datos finales
        onboarding_completed: true
    };
    
    const { error } = await supabase
        .from('profiles')
        .update(finalData)
        .eq('id', currentUser.id);

    if (error) {
        alert(`Error al guardar tu perfil: ${error.message}`);
    } else {
        window.location.href = '/public/modules/profile/profile.html';
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', initializeOnboarding);