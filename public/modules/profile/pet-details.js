// public/modules/profile/pet-details.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const petNameTitle = document.querySelector('#pet-name-title');
const editPetForm = document.querySelector('#edit-pet-form');
const deletePetButton = document.querySelector('#delete-pet-button');
const serviceHistoryContainer = document.querySelector('#service-history-container');
const photoGalleryContainer = document.querySelector('#photo-gallery-container');
const photoUploadInput = document.querySelector('#photo-upload');
const petMainPhoto = document.querySelector('#pet-main-photo'); // <-- Nuevo selector

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
    // <-- INICIO DE LA MODIFICACIÓN -->
    if (pet.image_url) {
        petMainPhoto.src = pet.image_url;
    } else {
        // Si no hay foto, puedes poner una imagen por defecto
        petMainPhoto.src = 'https://via.placeholder.com/150'; 
    }
    // <-- FIN DE LA MODIFICACIÓN -->
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

// --- MANEJO DE LA ELIMINACIÓN (CON MEJORES ALERTAS DE ERROR) ---
deletePetButton.addEventListener('click', async () => {
    if (confirm('¿Estás seguro? Esta acción no se puede deshacer y borrará también su historial de citas y su galería de fotos.')) {
        
        // Paso 1: Eliminar las citas asociadas
        const { error: appointmentsError } = await supabase.from('appointments').delete().eq('pet_id', petId);
        if (appointmentsError) {
            console.error('Error eliminando citas:', appointmentsError);
            alert('Error (Paso 1/3): No se pudieron eliminar las citas. Revisa las políticas de seguridad (RLS) de la tabla "appointments".');
            return;
        }

        // Paso 2: Eliminar las fotos de la galería
        const { data: files, error: listError } = await supabase.storage.from('pet_galleries').list(petId);
        if (listError) {
            console.error('Error listando fotos:', listError);
            alert('Error (Paso 2/3): No se pudieron listar las fotos para eliminar. Revisa las políticas del Storage.');
            return;
        }
        if (files && files.length > 0) {
            const filePaths = files.map(file => `${petId}/${file.name}`);
            const { error: removeError } = await supabase.storage.from('pet_galleries').remove(filePaths);
            if (removeError) {
                console.error('Error eliminando fotos:', removeError);
                alert('Error (Paso 2/3): No se pudieron eliminar las fotos. Revisa las políticas del Storage.');
                return;
            }
        }
        
        // Paso 3: Eliminar la mascota
        const { error: petError } = await supabase.from('pets').delete().eq('id', petId);
        if (petError) {
            console.error('Error eliminando la mascota:', petError);
            alert('Error (Paso 3/3): No se pudo eliminar la mascota. Revisa las políticas de seguridad (RLS) de la tabla "pets".');
        } else {
            alert('¡Mascota y todos sus datos han sido eliminados con éxito!');
            window.location.href = '/public/modules/profile/profile.html';
        }
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadPetDetails();
    photoUploadInput.addEventListener('change', handlePhotoUpload);
});