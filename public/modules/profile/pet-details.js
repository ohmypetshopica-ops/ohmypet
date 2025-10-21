// public/modules/profile/pet-details.js
import { supabase, getPetLastServiceDate } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const petNameTitle = document.querySelector('#pet-name-title');
const editPetForm = document.querySelector('#edit-pet-form');
const skeletonLoader = document.querySelector('#skeleton-loader'); // Nuevo
const deletePetButton = document.querySelector('#delete-pet-button');
const petMainPhoto = document.querySelector('#pet-main-photo');
const historyButton = document.querySelector('#history-button');
const photoUploadInput = document.querySelector('#photo-upload');
const changePhotoButton = document.querySelector('#change-photo-btn');
const sizeButtons = document.querySelectorAll('.size-btn');
const hiddenSizeInput = document.querySelector('input#size');
const sexButtons = document.querySelectorAll('.sex-btn');
const hiddenSexInput = document.querySelector('input#sex');
const birthDateInput = document.querySelector('#birth_date');
const calculatedAgeSpan = document.querySelector('#calculated-age');
const reminderFrequencyInput = document.querySelector('#reminder_frequency_days');
const reminderStartDateInput = document.querySelector('#reminder_start_date_input'); // Cambiado de last_grooming_date_input
const setLastServiceDateBtn = document.querySelector('#set-last-service-date-btn');

// --- ID DE LA MASCOTA DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const petId = urlParams.get('id');
let currentUser = null;
let photoFile = null;

// --- FUNCIÓN PARA CALCULAR EDAD ---
const calculateAge = (birthDate) => {
    if (!birthDate) return 'Sin fecha';
    
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    if (years === 0) {
        return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    } else if (months === 0) {
        return `${years} ${years === 1 ? 'año' : 'años'}`;
    } else {
        return `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
};

// --- ACTUALIZAR EDAD CALCULADA ---
const updateCalculatedAge = () => {
    if (birthDateInput) {
        const birthDate = birthDateInput.value;
        calculatedAgeSpan.textContent = calculateAge(birthDate);
    }
};

// --- FUNCIÓN PARA CARGAR LOS DATOS DE LA MASCOTA ---
const loadPetDetails = async () => {
    // ========= INICIO DE LA MEJORA DE CARGA =========
    skeletonLoader.classList.remove('hidden');
    editPetForm.classList.add('hidden');
    // ========= FIN DE LA MEJORA DE CARGA =========

    if (!petId) {
        window.location.href = '/public/modules/profile/profile.html';
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }
    currentUser = user;

    const { data: pet, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId) // CORRECCIÓN APLICADA AQUÍ
        .eq('owner_id', user.id)
        .single();

    if (error || !pet) {
        alert('Mascota no encontrada o no tienes permiso para verla.');
        window.location.href = '/public/modules/profile/profile.html';
        return;
    }

    petNameTitle.textContent = pet.name;
    document.querySelector('#name').value = pet.name;
    document.querySelector('#breed').value = pet.breed || '';
    document.querySelector('#weight').value = pet.weight || '';
    document.querySelector('#observations').value = pet.observations || '';
    if (birthDateInput) birthDateInput.value = pet.birth_date || '';
    
    if (reminderFrequencyInput) reminderFrequencyInput.value = pet.reminder_frequency_days || '';
    // Mapear al nuevo ID
    if (reminderStartDateInput) reminderStartDateInput.value = pet.last_grooming_date || ''; 

    updateCalculatedAge();

    if (pet.image_url) {
        petMainPhoto.src = pet.image_url;
    }

    hiddenSexInput.value = pet.sex || '';
    sexButtons.forEach(btn => {
        btn.classList.remove('selected-male', 'selected-female');
        if (btn.dataset.sex === pet.sex) {
            btn.classList.add(pet.sex === 'Macho' ? 'selected-male' : 'selected-female');
        }
    });

    hiddenSizeInput.value = pet.size || '';
    sizeButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.size === pet.size) {
            btn.classList.add('selected');
        }
    });

    historyButton.href = `/public/modules/profile/service-history.html?id=${petId}`;

    // ========= INICIO DE LA MEJORA DE CARGA =========
    skeletonLoader.classList.add('hidden');
    editPetForm.classList.remove('hidden');
    // ========= FIN DE LA MEJORA DE CARGA =========
};

// --- EVENT LISTENERS ---

sexButtons.forEach(button => {
    button.addEventListener('click', () => {
        sexButtons.forEach(btn => btn.classList.remove('selected-male', 'selected-female'));
        button.classList.add(button.dataset.sex === 'Macho' ? 'selected-male' : 'selected-female');
        hiddenSexInput.value = button.dataset.sex;
    });
});

sizeButtons.forEach(button => {
    button.addEventListener('click', () => {
        sizeButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        hiddenSizeInput.value = button.dataset.size;
    });
});

if (birthDateInput) {
    birthDateInput.addEventListener('change', updateCalculatedAge);
}

if (changePhotoButton) {
    changePhotoButton.addEventListener('click', () => {
        photoUploadInput.click();
    });
}

if (photoUploadInput) {
    photoUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            photoFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                petMainPhoto.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- NUEVO LISTENER PARA EL BOTÓN DE ÚLTIMA CITA ---
if (setLastServiceDateBtn) {
    setLastServiceDateBtn.addEventListener('click', async () => {
        setLastServiceDateBtn.disabled = true;
        setLastServiceDateBtn.textContent = 'Buscando...';
        
        const lastDate = await getPetLastServiceDate(petId);
        
        if (lastDate) {
            reminderStartDateInput.value = lastDate;
            setLastServiceDateBtn.textContent = '¡Fecha establecida! (Usar Última Cita Completada)';
        } else {
            setLastServiceDateBtn.textContent = 'No se encontró cita completada.';
            reminderStartDateInput.value = '';
        }

        setTimeout(() => {
            setLastServiceDateBtn.textContent = 'Usar Última Cita Completada';
            setLastServiceDateBtn.disabled = false;
        }, 3000);
    });
}


editPetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const updatedPet = {
        name: document.querySelector('#name').value,
        breed: document.querySelector('#breed').value,
        sex: hiddenSexInput.value,
        size: hiddenSizeInput.value,
        weight: parseFloat(document.querySelector('#weight').value) || null,
        birth_date: birthDateInput.value || null,
        observations: document.querySelector('#observations').value,
        reminder_frequency_days: parseInt(reminderFrequencyInput.value) || null,
        last_grooming_date: reminderStartDateInput.value || null // Usa el valor del nuevo campo
    };

    if (photoFile) {
        const fileName = `${currentUser.id}/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('pet_galleries').upload(fileName, photoFile, { upsert: true });
        
        if (uploadError) {
            console.error('Error al subir la nueva foto:', uploadError);
            alert('Hubo un error al subir la nueva foto. Se guardarán los otros cambios sin actualizar la imagen.');
        } else {
            const { data } = supabase.storage.from('pet_galleries').getPublicUrl(fileName);
            updatedPet.image_url = data.publicUrl;
        }
    }

    const { error } = await supabase
        .from('pets')
        .update(updatedPet)
        .eq('id', petId)
        .eq('owner_id', currentUser.id);

    if (error) {
        console.error('Error al actualizar la mascota:', error);
        alert('Hubo un error al guardar los cambios.');
    } else {
        alert('¡Cambios guardados exitosamente!');
        petNameTitle.textContent = updatedPet.name;
    }
});

deletePetButton.addEventListener('click', async () => {
    const confirmDelete = confirm(`¿Estás seguro de eliminar a ${petNameTitle.textContent}? Esta acción no se puede deshacer.`);
    if (!confirmDelete) return;

    const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId)
        .eq('owner_id', currentUser.id);

    if (error) {
        console.error('Error al eliminar mascota:', error);
        alert('Hubo un error al eliminar la mascota.');
    } else {
        alert('Mascota eliminada exitosamente.');
        window.location.href = '/public/modules/profile/profile.html';
    }
});

// --- INICIALIZAR ---
document.addEventListener('DOMContentLoaded', () => {
    loadPetDetails();
    
    if (birthDateInput) {
        birthDateInput.max = new Date().toISOString().split('T')[0];
    }
});