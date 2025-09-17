// public/modules/profile/pet-details.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const petNameTitle = document.querySelector('#pet-name-title');
const editPetForm = document.querySelector('#edit-pet-form');
const deletePetButton = document.querySelector('#delete-pet-button');
const serviceHistoryContainer = document.querySelector('#service-history-container');
const photoGalleryContainer = document.querySelector('#photo-gallery-container');
const photoUploadInput = document.querySelector('#photo-upload');


// --- ID DE LA MASCOTA DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const petId = urlParams.get('id');

// --- FUNCIÓN PARA CARGAR EL HISTORIAL DE SERVICIOS ---
const loadServiceHistory = async () => {
    if (!petId) return;

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('appointment_date, appointment_time, service')
        .eq('pet_id', petId)
        .order('appointment_date', { ascending: false });

    if (error) {
        console.error('Error al cargar el historial de servicios:', error);
        serviceHistoryContainer.innerHTML = `<p class="text-center text-red-500">No se pudo cargar el historial.</p>`;
        return;
    }

    if (appointments && appointments.length > 0) {
        serviceHistoryContainer.innerHTML = appointments.map(app => `
            <div class="bg-gray-100 p-4 rounded-lg shadow-sm">
                <p class="font-bold text-gray-800">${app.appointment_date} a las ${app.appointment_time}</p>
                <p class="text-gray-600">${app.service}</p>
            </div>
        `).join('');
    } else {
        serviceHistoryContainer.innerHTML = `<p class="text-center text-gray-500">No hay servicios registrados para esta mascota.</p>`;
    }
};

// --- FUNCIÓN PARA CARGAR LA GALERÍA DE FOTOS ---
const loadPetGallery = async () => {
    if (!petId) return;

    const { data, error } = await supabase.storage.from('pet_galleries').list(petId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
        console.error('Error al listar las imágenes:', error);
        return;
    }

    if (data && data.length > 0) {
        photoGalleryContainer.innerHTML = '';
        data.forEach(file => {
            const { publicUrl } = supabase.storage.from('pet_galleries').getPublicUrl(`${petId}/${file.name}`).data;
            const imgElement = document.createElement('img');
            imgElement.src = publicUrl;
            imgElement.alt = `Foto de ${petNameTitle.textContent}`;
            imgElement.className = 'w-full h-auto object-cover rounded-lg shadow-md';
            photoGalleryContainer.appendChild(imgElement);
        });
    } else {
        photoGalleryContainer.innerHTML = `<p class="col-span-full text-center text-gray-500">No hay fotos en la galería.</p>`;
    }
};


// --- FUNCIÓN PARA MANEJAR LA SUBIDA DE FOTOS ---
const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !petId) return;

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${petId}/${fileName}`;

    const { error } = await supabase.storage.from('pet_galleries').upload(filePath, file);

    if (error) {
        console.error('Error al subir la foto:', error);
        alert('Hubo un error al subir la foto.');
    } else {
        alert('¡Foto subida con éxito!');
        loadPetGallery(); // Recargar la galería
    }
};


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

    // Cargar datos adicionales
    loadServiceHistory();
    loadPetGallery();
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
document.addEventListener('DOMContentLoaded', () => {
    loadPetDetails();
    photoUploadInput.addEventListener('change', handlePhotoUpload);
});