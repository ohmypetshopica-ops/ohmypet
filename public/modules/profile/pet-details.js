// public/modules/profile/pet-details.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const petNameTitle = document.querySelector('#pet-name-title');
const editPetForm = document.querySelector('#edit-pet-form');
const deletePetButton = document.querySelector('#delete-pet-button');
const petMainPhoto = document.querySelector('#pet-main-photo');
const historyButton = document.querySelector('#history-button'); // <-- Nuevo selector

// --- ID DE LA MASCOTA DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const petId = urlParams.get('id');

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

    const { data: pet, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .eq('owner_id', user.id)
        .single();

    if (error || !pet) {
        console.error('Error al cargar la mascota o mascota no encontrada:', error);
        alert('Mascota no encontrada o no tienes permiso para verla.');
        window.location.href = '/public/modules/profile/profile.html';
        return;
    }

    // Rellenar el formulario y la UI con los datos
    petNameTitle.textContent = pet.name;
    if (pet.image_url) {
        petMainPhoto.src = pet.image_url;
    } else {
        petMainPhoto.src = 'https://via.placeholder.com/150';
    }
    editPetForm.name.value = pet.name;
    editPetForm.breed.value = pet.breed;
    editPetForm.size.value = pet.size;
    editPetForm.weight.value = pet.weight || '';
    editPetForm.sex.value = pet.sex;
    editPetForm.age.value = pet.age || '';
    editPetForm.observations.value = pet.observations || '';

    // Configurar el enlace del botón de historial
    historyButton.href = `/public/modules/profile/service-history.html?id=${petId}`;
};

// --- MANEJO DEL FORMULARIO DE EDICIÓN ---
editPetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const updatedPet = {
        name: editPetForm.name.value,
        breed: editPetForm.breed.value,
        size: editPetForm.size.value,
        weight: editPetForm.weight.value ? parseFloat(editPetForm.weight.value) : null,
        sex: editPetForm.sex.value,
        age: editPetForm.age.value ? parseInt(editPetForm.age.value) : null,
        observations: editPetForm.observations.value
    };

    const { error } = await supabase
        .from('pets')
        .update(updatedPet)
        .eq('id', petId);

    if (error) {
        console.error('Error al guardar cambios:', error);
        alert('Hubo un error al guardar los cambios.');
    } else {
        alert('¡Cambios guardados con éxito!');
        petNameTitle.textContent = updatedPet.name;
    }
});

// --- MANEJO DE LA ELIMINACIÓN ---
deletePetButton.addEventListener('click', async () => {
    if (confirm('¿Estás seguro? Esta acción no se puede deshacer y borrará también su historial de citas.')) {
        
        const { error: appointmentsError } = await supabase.from('appointments').delete().eq('pet_id', petId);
        if (appointmentsError) {
            console.error('Error eliminando citas:', appointmentsError);
            alert('Error (Paso 1/2): No se pudieron eliminar las citas. Revisa las políticas de seguridad (RLS) de la tabla "appointments".');
            return;
        }

        const { error: petError } = await supabase.from('pets').delete().eq('id', petId);
        if (petError) {
            console.error('Error eliminando la mascota:', petError);
            alert('Error (Paso 2/2): No se pudo eliminar la mascota. Revisa las políticas de seguridad (RLS) de la tabla "pets".');
        } else {
            alert('¡Mascota y todos sus datos han sido eliminados con éxito!');
            window.location.href = '/public/modules/profile/profile.html';
        }
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadPetDetails);