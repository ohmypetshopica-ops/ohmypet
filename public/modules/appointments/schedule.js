// public/modules/appointments/schedule.js

import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const ownerNameInput = document.getElementById('owner-name');
const petSelect = document.getElementById('pet-select');
const noPetsMessage = document.getElementById('no-pets-message');
const appointmentForm = document.getElementById('appointment-form');
const submitButton = appointmentForm?.querySelector('button[type="submit"]');

// Elementos de detalles de mascota
const petDetailsContainer = document.getElementById('pet-details-container');
const petBreedInput = document.getElementById('pet-breed');
const petSizeInput = document.getElementById('pet-size');

// Mascotas del usuario
let userPets = [];

/**
 * Carga el nombre del dueño y sus mascotas registradas.
 */
const loadUserDataAndPets = async () => {
    if (!ownerNameInput || !petSelect) return;

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
        console.error("Error al obtener usuario:", userError);
        return;
    }

    if (user) {
        // --- Cargar nombre del perfil ---
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("Error al obtener perfil:", profileError);
        } else if (profile && profile.full_name) {
            ownerNameInput.value = profile.full_name;
        }

        // --- Cargar las mascotas del usuario ---
        const { data: pets, error: petsError } = await supabase
            .from('pets')
            .select('id, name, breed, size')
            .eq('owner_id', user.id);

        if (petsError) {
            console.error('Error al cargar las mascotas:', petsError);
            return;
        }

        userPets = pets || [];

        if (pets && pets.length > 0) {
            petSelect.innerHTML = '<option value="" disabled selected>-- Elige una mascota --</option>';
            pets.forEach(pet => {
                const option = document.createElement('option');
                option.value = pet.id;
                option.textContent = pet.name;
                petSelect.appendChild(option);
            });
        } else {
            petSelect.classList.add('hidden');
            noPetsMessage.classList.remove('hidden');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }

    } else {
        // Si no hay usuario → redirigir al login
        window.location.href = '/public/modules/login/login.html';
    }
};

// --- EVENTO PARA CAMBIO DE MASCOTA ---
if (petSelect) {
    petSelect.addEventListener('change', () => {
        const selectedPetId = petSelect.value;
        const selectedPet = userPets.find(pet => pet.id == selectedPetId);

        if (selectedPet) {
            petBreedInput.value = selectedPet.breed || 'No especificada';
            petSizeInput.value = selectedPet.size || 'No especificado';
            petDetailsContainer.classList.remove('hidden');
        } else {
            petDetailsContainer.classList.add('hidden');
        }
    });
}

/**
 * Función auxiliar: valida si la hora está dentro del rango permitido (10:00 a 16:00).
 */
const isTimeInRange = (time) => {
    const [hour, minute] = time.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return false;
    return (hour > 9 && hour < 16) || (hour === 10 && minute >= 0) || (hour === 16 && minute === 0);
};

/**
 * Lógica del formulario de agendamiento.
 */
if (appointmentForm) {
    appointmentForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const ownerPhoneNumber = '51904343849';
        const ownerName = ownerNameInput.value.trim();
        const selectedPetId = petSelect.value;
        const selectedPet = userPets.find(pet => pet.id == selectedPetId);

        const appointmentDate = document.getElementById('appointment-date').value;
        const appointmentTime = document.getElementById('appointment-time').value;
        const extraNotes = document.getElementById('extra-notes').value.trim();

        // --- Validaciones ---
        if (!selectedPet) {
            alert('Por favor, selecciona una de tus mascotas.');
            return;
        }
        if (!appointmentDate || !appointmentTime) {
            alert('Por favor, completa la fecha y hora de la cita.');
            return;
        }
        if (!isTimeInRange(appointmentTime)) {
            alert('La hora debe estar entre las 10:00 y las 16:00.');
            return;
        }

        // --- Formateo del mensaje ---
        const messageParts = [
            "*¡Nueva Solicitud de Cita!*",
            "",
            `*Cliente:* ${ownerName}`,
            `*Mascota:* ${selectedPet.name}`,
            `*Raza:* ${selectedPet.breed || 'No especificada'}`,
            `*Tamaño:* ${selectedPet.size || 'No especificado'}`,
            `*Fecha:* ${appointmentDate}`,
            `*Hora:* ${appointmentTime}`
        ];

        if (extraNotes) {
            messageParts.push("", "*Notas Adicionales:*", extraNotes);
        }
        
        const message = messageParts.join('\n');
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${ownerPhoneNumber}?text=${encodedMessage}`;

        // --- Abrir WhatsApp ---
        window.open(whatsappUrl, '_blank');

        // --- Redirigir al inicio ---
        window.location.href = '/public/index.html?from=schedule';
    });
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadUserDataAndPets);
