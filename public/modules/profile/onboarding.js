import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const onboardingForm = document.querySelector('#onboarding-form');
const steps = document.querySelectorAll('.step');
const nextButtons = document.querySelectorAll('.next-btn');
const prevButtons = document.querySelectorAll('.prev-btn');
const progressBar = document.querySelector('#progress-bar');
const formTitle = document.querySelector('#form-title');
const formSubtitle = document.querySelector('#form-subtitle');
const avatarSelectionContainer = document.querySelector('#avatar-selection');
const avatarUrlInput = document.querySelector('#avatar_url');

// --- ESTADO DEL FORMULARIO ---
let currentStep = 1;
const totalSteps = steps.length;
const onboardingData = {};
let currentUser = null;

const formTitles = ["Crea tu perfil", "Datos de contacto", "Contacto de emergencia", "Elige tu avatar"];
const formSubtitles = ["Cuéntanos un poco sobre ti.", "Necesitamos estos datos para coordinar los servicios.", "Es importante en caso no podamos contactarte.", "Selecciona una imagen para tu perfil."];

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

// --- LÓGICA PRINCIPAL ---
const initializeOnboarding = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }
    currentUser = user;

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (profile && profile.full_name) {
        const nameParts = profile.full_name.split(' ');
        document.querySelector('#first_name').value = nameParts[0] || '';
        document.querySelector('#last_name').value = nameParts.slice(1).join(' ') || '';
    }
    showStep(1); // Aseguramos que inicie en el paso 1
};

// --- MANEJO DE EVENTOS ---
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

if (avatarSelectionContainer) {
    avatarSelectionContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'IMG') {
            avatarSelectionContainer.querySelectorAll('.avatar-option').forEach(img => img.classList.remove('selected'));
            event.target.classList.add('selected');
            avatarUrlInput.value = event.target.src;
        }
    });
}

onboardingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateStep(currentStep)) return;
    
    collectStepData(currentStep);

    const finalData = {
        ...onboardingData,
        onboarding_completed: true
    };
    
    const { error } = await supabase.from('profiles').update(finalData).eq('id', currentUser.id);

    if (error) {
        alert(`Error al guardar tu perfil: ${error.message}`);
    } else {
        window.location.href = '/public/modules/profile/profile.html';
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', initializeOnboarding);