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

    // Rellenar formulario
    petNameTitle.textContent = pet.name;
    petMainPhoto.src = pet.image_url || 'https://via.placeholder.com/150';
    editPetForm.name.value = pet.name;
    editPetForm.breed.value = pet.breed;
    editPetForm.birth_date.value = pet.birth_date || '';
    editPetForm.weight.value = pet.weight || '';
    editPetForm.observations.value = pet.observations || '';

    // Calcular y mostrar edad
    updateCalculatedAge();

    // Seleccionar botones de sexo
    hiddenSexInput.value = pet.sex;
    sexButtons.forEach(button => {
        button.classList.remove('selected-male', 'selected-female');
        if (button.dataset.sex === pet.sex) {
            button.classList.add(pet.sex === 'Macho' ? 'selected-male' : 'selected-female');
        }
    });

    // Seleccionar botones de tamaño
    hiddenSizeInput.value = pet.size;
    sizeButtons.forEach(button => {
        button.classList.remove('selected');
        if (button.dataset.size === pet.size) {
            button.classList.add('selected');
        }
    });

    historyButton.href = `/public/modules/profile/service-history.html?id=${petId}`;
};

// --- MANEJO DE EVENTOS DE BOTONES ---
sizeButtons.forEach(button => {
    button.addEventListener('click', () => {
        sizeButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        hiddenSizeInput.value = button.dataset.size;
    });
});

sexButtons.forEach(button => {
    button.addEventListener('click', () => {
        sexButtons.forEach(btn => btn.classList.remove('selected-male', 'selected-female'));
        const selectedSex = button.dataset.sex;
        button.classList.add(selectedSex === 'Macho' ? 'selected-male' : 'selected-female');
        hiddenSexInput.value = selectedSex;
    });
});

photoUploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        photoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => { petMainPhoto.src = e.target.result; };
        reader.readAsDataURL(file);
    }
});

// Actualizar edad cuando cambie la fecha
birthDateInput.addEventListener('change', updateCalculatedAge);

// --- MANEJO DEL FORMULARIO DE EDICIÓN ---
editPetForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    let imageUrl = petMainPhoto.src;
    if (photoFile) {
        const fileName = `${currentUser.id}/${petId}/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('pet_galleries').upload(fileName, photoFile, {
            upsert: true
        });
        if (uploadError) {
            alert('Hubo un error al subir la nueva foto. Se mantendrá la anterior.');
        } else {
            const { publicUrl } = supabase.storage.from('pet_galleries').getPublicUrl(fileName).data;
            imageUrl = publicUrl;
        }
    }

    const updatedPet = {
        name: editPetForm.name.value,
        breed: editPetForm.breed.value,
        size: hiddenSizeInput.value,
        sex: hiddenSexInput.value,
        weight: editPetForm.weight.value ? parseFloat(editPetForm.weight.value) : null,
        birth_date: editPetForm.birth_date.value || null,
        observations: editPetForm.observations.value,
        image_url: imageUrl,
    };

    const { error } = await supabase.from('pets').update(updatedPet).eq('id', petId);

    if (error) {
        alert('Hubo un error al guardar los cambios.');
    } else {
        alert('¡Cambios guardados con éxito!');
        petNameTitle.textContent = updatedPet.name;
        photoFile = null;
    }
});

// --- MANEJO DE LA ELIMINACIÓN ---
deletePetButton.addEventListener('click', async () => {
    if (confirm('¿Estás seguro? Se borrará la mascota y su historial de citas.')) {
        await supabase.from('appointments').delete().eq('pet_id', petId);
        const { error: petError } = await supabase.from('pets').delete().eq('id', petId);
        if (petError) {
            alert('Error al eliminar la mascota.');
        } else {
            alert('Mascota eliminada con éxito.');
            window.location.href = '/public/modules/profile/profile.html';
        }
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadPetDetails();
    
    // Establecer fecha máxima como hoy
    if (birthDateInput) {
        birthDateInput.max = new Date().toISOString().split('T')[0];
    }
});