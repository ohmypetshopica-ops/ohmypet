// public/modules/profile/add-pet.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const addPetForm = document.querySelector('#add-pet-form');

// --- MANEJO DEL FORMULARIO ---
addPetForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('Usuario no autenticado. Redirigiendo al login.');
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    // Recolección de datos del formulario
    const formData = new FormData(addPetForm);
    const newPet = {
        // CORRECCIÓN: Usamos 'owner_id' en lugar de 'user_id'
        owner_id: user.id, 
        name: formData.get('name'),
        // CORRECCIÓN: Agregamos un valor por defecto para 'species'
        species: 'Perro', 
        breed: formData.get('breed'),
        size: formData.get('size'),
        weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
        sex: formData.get('sex'),
        age: formData.get('age') ? parseInt(formData.get('age')) : null,
        // CORRECCIÓN: Ahora esta columna existe en la base de datos
        observations: formData.get('observations') 
    };

    // Inserción en la base de datos
    const { data, error } = await supabase
        .from('pets')
        .insert([newPet]);

    if (error) {
        console.error('Error al agregar la mascota:', error);
        alert('Hubo un error al guardar la mascota. Inténtalo de nuevo.');
    } else {
        alert('Mascota agregada con éxito!');
        // Redirigir de vuelta a la página del perfil después de guardar
        window.location.href = '/public/modules/profile/profile.html';
    }
});