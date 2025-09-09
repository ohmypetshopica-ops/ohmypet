// public/modules/appointments/schedule.js

import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const ownerNameInput = document.getElementById('owner-name');
const petSelect = document.getElementById('pet-select');
const noPetsMessage = document.getElementById('no-pets-message');
const appointmentForm = document.getElementById('appointment-form');
const submitButton = appointmentForm.querySelector('button[type="submit"]');

// Nuevos elementos para mostrar los detalles
const petDetailsContainer = document.getElementById('pet-details-container');
const petBreedInput = document.getElementById('pet-breed');
const petSizeInput = document.getElementById('pet-size');

// Guardaremos las mascotas aquí para acceder a sus datos fácilmente
let userPets = [];

/**
 * Carga el nombre del dueño y sus mascotas registradas.
 */
const loadUserDataAndPets = async () => {
    // ... (El código de esta función no cambia, la dejamos como estaba)
    if (!ownerNameInput || !petSelect) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // --- Cargar nombre del perfil ---
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (profile && profile.full_name) {
            ownerNameInput.value = profile.full_name;
        }

        // --- Cargar las mascotas del usuario ---
        const { data: pets, error } = await supabase
            .from('pets')
            .select('id, name, breed, size')
            .eq('owner_id', user.id);

        if (error) {
            console.error('Error al cargar las mascotas:', error);
            return;
        }

        userPets = pets; // Guardamos las mascotas en nuestra variable

        if (pets && pets.length > 0) {
            // Si el usuario tiene mascotas, las mostramos
            petSelect.innerHTML = '<option value="" disabled selected>-- Elige una mascota --</option>'; // Opción por defecto
            pets.forEach(pet => {
                const option = document.createElement('option');
                option.value = pet.id; // El valor será el ID
                option.textContent = pet.name; // El texto visible será el nombre
                petSelect.appendChild(option);
            });
        } else {
            // Si no tiene mascotas, mostramos un mensaje y ocultamos el selector
            petSelect.classList.add('hidden');
            noPetsMessage.classList.remove('hidden');
            // Deshabilitamos el botón de agendar para evitar envíos
            submitButton.disabled = true;
            submitButton.classList.add('opacity-50', 'cursor-not-allowed');
        }

    } else {
        // Si no hay usuario, redirigir al login (importante por seguridad)
        window.location.href = '/public/modules/login/login.html';
    }
};


// --- ✅ NUEVA LÓGICA: EVENTO PARA EL SELECT DE MASCOTAS ✅ ---
if (petSelect) {
    petSelect.addEventListener('change', () => {
        const selectedPetId = petSelect.value;
        const selectedPet = userPets.find(pet => pet.id == selectedPetId);

        if (selectedPet) {
            // Si se seleccionó una mascota válida
            // Llenamos los campos con sus datos
            petBreedInput.value = selectedPet.breed || 'No especificada';
            petSizeInput.value = selectedPet.size || 'No especificado';
            
            // Mostramos el contenedor de los detalles
            petDetailsContainer.classList.remove('hidden');
        } else {
            // Si se deselecciona o la opción no es válida, ocultamos el contenedor
            petDetailsContainer.classList.add('hidden');
        }
    });
}


/**
 * Lógica del formulario de agendamiento.
 */
if (appointmentForm) {
    // ... (El código de esta función no cambia, la dejamos como estaba)
    appointmentForm.addEventListener('submit', (event) => {
        event.preventDefault();

        // --- Recolección de datos ---
        const ownerPhoneNumber = '51904343849';
        const ownerName = ownerNameInput.value;
        const selectedPetId = petSelect.value; // Obtenemos el ID de la mascota seleccionada

        // Buscamos los datos completos de la mascota en nuestro array
        const selectedPet = userPets.find(pet => pet.id == selectedPetId);

        const appointmentDate = document.getElementById('appointment-date').value;
        const appointmentTime = document.getElementById('appointment-time').value;
        const extraNotes = document.getElementById('extra-notes').value.trim();

        // --- Validación ---
        if (!selectedPet) {
            alert('Por favor, selecciona una de tus mascotas.');
            return;
        }
        if (!appointmentDate || !appointmentTime) {
            alert('Por favor, completa la fecha y hora de la cita.');
            return;
        }

        // --- Formateo del mensaje usando los datos de la mascota seleccionada ---
        const messageParts = [
            "*¡Nueva Solicitud de Cita!*",
            "",
            `*Cliente:* ${ownerName}`,
            `*Mascota:* ${selectedPet.name}`, // Usamos el nombre del objeto
            `*Raza:* ${selectedPet.breed}`,   // Usamos la raza del objeto
            `*Tamaño:* ${selectedPet.size}`,   // Usamos el tamaño del objeto
            `*Fecha:* ${appointmentDate}`,
            `*Hora:* ${appointmentTime}`
        ];

        if (extraNotes) {
            messageParts.push("");
            messageParts.push("*Notas Adicionales:*");
            messageParts.push(extraNotes);
        }
        
        const message = messageParts.join('\n');

        // --- Construcción y apertura de URL de WhatsApp ---
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${ownerPhoneNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
        
        // --- Redirigir a la página de inicio con un parámetro ---
        window.location.href = '/public/index.html?from=schedule';
    });
}

// --- INICIALIZACIÓN ---
// Carga los datos del usuario y sus mascotas cuando la página esté lista.
document.addEventListener('DOMContentLoaded', loadUserDataAndPets);