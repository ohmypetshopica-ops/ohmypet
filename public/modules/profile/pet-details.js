// public/modules/profile/pet-details.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const petNameTitle = document.querySelector('#pet-name-title');
const editPetForm = document.querySelector('#edit-pet-form');
const deletePetButton = document.querySelector('#delete-pet-button');

// --- ID DE LA MASCOTA DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const petId = urlParams.get('id');

// --- FUNCIÓN PARA CARGAR LOS DATOS DE LA MASCOTA ---
const loadPetDetails = async () => {
    if (!petId) {
        // Redirigir si no hay ID en la URL
        window.location.href = '/public/modules/profile/profile.html';
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('Usuario no autenticado.');
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    const { data: pet, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .eq('owner_id', user.id) // Seguridad: solo el dueño puede ver y editar
        .single();

    if (error || !pet) {
        console.error('Error al cargar la mascota o mascota no encontrada:', error);
        alert('Mascota no encontrada o no tienes permiso para verla.');
        window.location.href = '/public/modules/profile/profile.html';
        return;
    }

    // Rellenar el formulario con los datos de la mascota
    petNameTitle.textContent = pet.name;
    editPetForm.name.value = pet.name;
    editPetForm.breed.value = pet.breed;
    editPetForm.size.value = pet.size;
    editPetForm.weight.value = pet.weight || '';
    editPetForm.sex.value = pet.sex;
    editPetForm.age.value = pet.age || '';
    editPetForm.observations.value = pet.observations || '';
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
    }
});

// --- MANEJO DE LA ELIMINACIÓN ---
deletePetButton.addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres eliminar esta mascota? Esta acción no se puede deshacer.')) {
        const { error } = await supabase
            .from('pets')
            .delete()
            .eq('id', petId);
        
        if (error) {
            console.error('Error al eliminar la mascota:', error);
            alert('Hubo un error al eliminar la mascota.');
        } else {
            alert('Mascota eliminada con éxito.');
            window.location.href = '/public/modules/profile/profile.html';
        }
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadPetDetails);