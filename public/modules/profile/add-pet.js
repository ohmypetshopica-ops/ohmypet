import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const addPetForm = document.querySelector('#add-pet-form');
const steps = document.querySelectorAll('.step');
const nextButtons = document.querySelectorAll('.next-btn');
const prevButtons = document.querySelectorAll('.prev-btn');
const progressBar = document.querySelector('#progress-bar');
const formTitle = document.querySelector('#form-title');
const formSubtitle = document.querySelector('#form-subtitle');
const photoInput = document.querySelector('#photo');
const imagePreview = document.querySelector('#image-preview');
const sizeButtons = document.querySelectorAll('.size-btn');
const hiddenSizeInput = document.querySelector('#size');
const sexButtons = document.querySelectorAll('.sex-btn');
const hiddenSexInput = document.querySelector('#sex');

// --- ESTADO ---
let currentStep = 1;
const totalSteps = steps.length;
const petData = {};
let photoFile = null;

const formTitles = ["Cuéntanos sobre tu mascota", "Detalles físicos", "Observaciones finales"];
const formSubtitles = ["Comencemos con lo básico.", "Ayúdanos a conocer mejor a tu mascota.", "Agrega cualquier detalle importante."];

// --- NAVEGACIÓN ---
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
        if (input.type === 'hidden' && !input.value.trim()) {
            alert(`Por favor, completa todos los campos requeridos.`);
            return false;
        }
        if (input.type !== 'hidden' && !input.value.trim()) {
            alert(`Por favor, completa todos los campos requeridos.`);
            input.focus();
            return false;
        }
    }
    return true;
};

const collectStepData = (stepNumber) => {
    const currentStepElement = document.querySelector(`#step-${stepNumber}`);
    const inputs = currentStepElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.name) {
            petData[input.name] = input.value;
        }
    });
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

photoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        photoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => { imagePreview.src = e.target.result; };
        reader.readAsDataURL(file);
    }
});

sizeButtons.forEach(button => {
    button.addEventListener('click', () => {
        sizeButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        hiddenSizeInput.value = button.dataset.size;
    });
});

sexButtons.forEach(button => {
    button.addEventListener('click', () => {
        sexButtons.forEach(btn => {
            btn.classList.remove('selected-male', 'selected-female');
        });
        const selectedSex = button.dataset.sex;
        if (selectedSex === 'Macho') {
            button.classList.add('selected-male');
        } else {
            button.classList.add('selected-female');
        }
        hiddenSexInput.value = selectedSex;
    });
});

// --- MANEJO DEL ENVÍO FINAL ---
addPetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    collectStepData(currentStep);
    const submitButton = addPetForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Guardando...';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('Usuario no autenticado. Redirigiendo al login.');
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    let imageUrl = null;
    if (photoFile) {
        const fileName = `${user.id}/${Date.now()}_${photoFile.name}`;
        const { error } = await supabase.storage.from('pet_galleries').upload(fileName, photoFile);
        if (error) {
            console.error('Error al subir la foto:', error);
            alert('Hubo un error al subir la foto. Se guardará la mascota sin imagen.');
        } else {
            const { publicUrl } = supabase.storage.from('pet_galleries').getPublicUrl(fileName).data;
            imageUrl = publicUrl;
        }
    }

    const finalPetData = {
        ...petData,
        owner_id: user.id,
        species: 'Perro',
        image_url: imageUrl,
        weight: petData.weight ? parseFloat(petData.weight) : null,
        birth_date: petData.birth_date || null,
    };
    
    // Eliminamos propiedades no correspondientes a columnas
    delete finalPetData.photo;
    delete finalPetData.age; // Por si acaso quedó algo

    const { error: insertError } = await supabase.from('pets').insert([finalPetData]);

    if (insertError) {
        console.error('Error al agregar la mascota:', insertError);
        alert('Hubo un error al guardar la mascota. Inténtalo de nuevo.');
        submitButton.disabled = false;
        submitButton.textContent = '¡Guardar Mascota!';
    } else {
        alert('¡Mascota agregada con éxito!');
        window.location.href = '/public/modules/profile/profile.html';
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    showStep(1);
    
    // Establecer fecha máxima como hoy
    const birthDateInput = document.querySelector('#birth_date');
    if (birthDateInput) {
        birthDateInput.max = new Date().toISOString().split('T')[0];
    }
});