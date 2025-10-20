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
const onboardingForm = document.querySelector('#onboarding-form');
const steps = document.querySelectorAll('.step');
const nextButtons = document.querySelectorAll('.next-btn');
const prevButtons = document.querySelectorAll('.prev-btn');
const progressBar = document.querySelector('#progress-bar');
const formTitle = document.querySelector('#form-title');
const formSubtitle = document.querySelector('#form-subtitle');
const avatarSelection = document.querySelector('#avatar-selection');
const avatarUrlInput = document.querySelector('#avatar_url');
const docTypeSelect = document.querySelector('#doc_type');
const docNumInput = document.querySelector('#doc_num');

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

// --- FUNCIÓN DE VALIDACIÓN MODIFICADA ---
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
    
    // --- INICIO DE LA NUEVA VALIDACIÓN (TELÉFONO) ---
    if (stepNumber === 3) {
        const phoneInput = document.querySelector('#phone');
        const phoneRaw = phoneInput.value;
        const cleanedPhone = cleanPhoneNumber(phoneRaw);
        
        if (cleanedPhone === null) {
            alert('El Teléfono/WhatsApp es inválido. Debe tener 9 dígitos o incluir un código de país válido (ej: +51 987...).');
            phoneInput.focus();
            return false;
        }
    }
    // --- FIN DE LA NUEVA VALIDACIÓN (TELÉFONO) ---
    
    // --- VALIDACIÓN DE DOCUMENTO ---
    if (stepNumber === 2) {
        const selectedType = docTypeSelect.value;
        const docNum = docNumInput.value;

        if (selectedType === 'DNI' && docNum.length !== 8) {
            alert('El DNI debe tener exactamente 8 dígitos.');
            docNumInput.focus();
            return false;
        }
        if (selectedType === 'Carnet de Extranjería' && docNum.length !== 9) {
            alert('El Carnet de Extranjería debe tener exactamente 9 dígitos.');
            docNumInput.focus();
            return false;
        }
    }
    // --- FIN DE LA NUEVA VALIDACIÓN ---

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
            avatarSelection.querySelectorAll('.avatar-option').forEach(img => {
                img.classList.remove('selected');
            });
            event.target.classList.add('selected');
            avatarUrlInput.value = event.target.src;
        }
    });
}

// --- NUEVA FUNCIÓN PARA VALIDACIÓN DE DOCUMENTO ---
const setupDocumentValidation = () => {
    if (!docTypeSelect || !docNumInput) return;

    const updateInputRules = () => {
        const selectedType = docTypeSelect.value;
        docNumInput.value = '';

        if (selectedType === 'DNI') {
            docNumInput.setAttribute('maxlength', '8');
            docNumInput.setAttribute('placeholder', '8 dígitos numéricos');
            docNumInput.setAttribute('pattern', '[0-9]{8}');
            docNumInput.setAttribute('inputmode', 'numeric');
        } else if (selectedType === 'Carnet de Extranjería') {
            docNumInput.setAttribute('maxlength', '9');
            docNumInput.setAttribute('placeholder', '9 dígitos numéricos');
            docNumInput.setAttribute('pattern', '[0-9]{9}');
            docNumInput.setAttribute('inputmode', 'numeric');
        } else {
            docNumInput.removeAttribute('maxlength');
            docNumInput.setAttribute('placeholder', 'Número de Documento');
            docNumInput.removeAttribute('pattern');
            docNumInput.setAttribute('inputmode', 'text');
        }
    };

    docTypeSelect.addEventListener('change', updateInputRules);

    docNumInput.addEventListener('input', () => {
        const selectedType = docTypeSelect.value;
        if (selectedType === 'DNI' || selectedType === 'Carnet de Extranjería') {
            docNumInput.value = docNumInput.value.replace(/[^0-9]/g, '');
        }
    });

    updateInputRules();
};


// --- LÓGICA PRINCIPAL ---
const initializeOnboarding = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }
    currentUser = user;

    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, doc_type, doc_num, phone, district, emergency_contact_name, emergency_contact_phone, avatar_url')
        .eq('id', user.id)
        .single();

    if (profile) {
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

    const userEmail = currentUser.email;

    const finalData = {
        ...onboardingData,
        email: userEmail,
        onboarding_completed: true,
        // Limpiar números de teléfono antes de guardar
        phone: cleanPhoneNumber(onboardingData.phone),
        emergency_contact_phone: cleanPhoneNumber(onboardingData.emergency_contact_phone)
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
document.addEventListener('DOMContentLoaded', () => {
    initializeOnboarding();
    setupDocumentValidation(); // Se llama a la nueva función
});