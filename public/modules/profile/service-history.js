// public/modules/profile/service-history.js

import { supabase } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const historyContainer = document.querySelector('#history-container');
const petNameHeader = document.querySelector('#pet-name-header');
const backButton = document.querySelector('#back-button');

// --- ID DE LA MASCOTA DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const petId = urlParams.get('id');

// --- FUNCIÓN PARA CARGAR LOS DATOS ---
const loadHistory = async () => {
    if (!petId) {
        alert('No se encontró el ID de la mascota.');
        window.location.href = '/public/modules/profile/profile.html';
        return;
    }

    // Configurar el botón de volver
    backButton.href = `/public/modules/profile/pet-details.html?id=${petId}`;

    // Cargar en paralelo el nombre de la mascota y su historial
    const [petResponse, appointmentsResponse] = await Promise.all([
        supabase.from('pets').select('name').eq('id', petId).single(),
        supabase.from('appointments').select('*').eq('pet_id', petId).order('appointment_date', { ascending: false })
    ]);

    const { data: pet, error: petError } = petResponse;
    const { data: appointments, error: appointmentsError } = appointmentsResponse;
    
    if (petError || !pet) {
        console.error('Error al cargar datos de la mascota:', petError);
    } else {
        petNameHeader.textContent = `Historial de ${pet.name}`;
    }

    if (appointmentsError) {
        console.error('Error al cargar el historial:', appointmentsError);
        historyContainer.innerHTML = '<p class="text-center text-red-500">No se pudo cargar el historial.</p>';
        return;
    }

    if (appointments && appointments.length > 0) {
        historyContainer.innerHTML = appointments.map(app => `
            <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm transition-transform hover:scale-105">
                <div class="flex justify-between items-center">
                    <p class="text-lg font-bold text-gray-800">${app.appointment_date}</p>
                    <span class="text-sm font-medium text-white ${app.status === 'Completado' ? 'bg-green-500' : 'bg-yellow-500'} px-2 py-1 rounded-full">${app.status || 'Pendiente'}</span>
                </div>
                <p class="text-gray-600 mt-1">Hora: ${app.appointment_time}</p>
                <p class="text-gray-700 mt-2">${app.service || 'Servicio de estética general.'}</p>
                ${app.notes ? `<p class="text-sm text-gray-500 mt-2 border-t pt-2">Notas: ${app.notes}</p>` : ''}
            </div>
        `).join('');
    } else {
        historyContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Esta mascota aún no tiene ningún servicio registrado.</p>';
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadHistory);