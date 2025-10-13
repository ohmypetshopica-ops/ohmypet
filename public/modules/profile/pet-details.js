import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const petNameTitle = document.querySelector('#pet-name-title');
const editPetForm = document.querySelector('#edit-pet-form');
const deletePetButton = document.querySelector('#delete-pet-button');
const petMainPhoto = document.querySelector('#pet-main-photo');
const historyButton = document.querySelector('#history-button');
const photoUploadInput = document.querySelector('#photo-upload');
const sizeButtons = document.querySelectorAll('.size-btn');
const hiddenSizeInput = document.querySelector('input#size');
const sexButtons = document.querySelectorAll('.sex-btn');
const hiddenSexInput = document.querySelector('input#sex');
const birthDateInput = document.querySelector('#birth_date');
const calculatedAgeSpan = document.querySelector('#calculated-age');

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
    const birthDate = birthDateInput.value;
    calculatedAgeSpan.textContent = calculateAge(birthDate);
};

// --- FUNCIÓN PARA CARGAR LOS DATOS DE LA MASCOTA ---
const loadPetDetails = async () => {
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
        .eq('id', petId)
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
    birthDateInput.value = pet.birth_date || '';
    
    // Actualizar edad calculada al cargar
    updateCalculatedAge();

    if (pet.image_url) {
        petMainPhoto.src = pet.image_url;
    }

    hiddenSexInput.value = pet.sex || '';
    sexButtons.forEach(btn => {
        if (btn.dataset.sex === pet.sex) {
            btn.classList.add('border-green-500', 'bg-green-50');
        }
    });

    hiddenSizeInput.value = pet.size || '';
    sizeButtons.forEach(btn => {
        if (btn.dataset.size === pet.size) {
            btn.classList.add('border-green-500', 'bg-green-50');
        }
    });

    historyButton.href = `/public/modules/profile/pet-history.html?id=${petId}`;
};

// --- BOTONES DE SEXO ---
sexButtons.forEach(button => {
    button.addEventListener('click', () => {
        sexButtons.forEach(btn => btn.classList.remove('border-green-500', 'bg-green-50'));
        button.classList.add('border-green-500', 'bg-green-50');
        hiddenSexInput.value = button.dataset.sex;
    });
});

// --- BOTONES DE TAMAÑO ---
sizeButtons.forEach(button => {
    button.addEventListener('click', () => {
        sizeButtons.forEach(btn => btn.classList.remove('border-green-500', 'bg-green-50'));
        button.classList.add('border-green-500', 'bg-green-50');
        hiddenSizeInput.value = button.dataset.size;
    });
});

// --- ACTUALIZAR EDAD EN TIEMPO REAL ---
birthDateInput.addEventListener('change', updateCalculatedAge);

// --- SUBIR FOTO ---
document.querySelector('#change-photo-btn').addEventListener('click', () => {
    photoUploadInput.click();
});

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

// --- GUARDAR CAMBIOS ---
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
    };

    if (photoFile) {
        const fileName = `${currentUser.id}/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('pet_galleries').upload(fileName, photoFile);
        if (!uploadError) {
            const { publicUrl } = supabase.storage.from('pet_galleries').getPublicUrl(fileName).data;
            updatedPet.image_url = publicUrl;
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
        loadPetDetails();
    }
});

// --- ELIMINAR MASCOTA ---
deletePetButton.addEventListener('click', async () => {
    const confirmDelete = confirm(`¿Estás seguro de eliminar a ${petNameTitle.textContent}?`);
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
    
    // Establecer fecha máxima como hoy
    if (birthDateInput) {
        birthDateInput.max = new Date().toISOString().split('T')[0];
    }
});