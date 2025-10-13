// Al inicio del archivo, importar la nueva API
import { addWeightRecord } from './pet-weight.api.js';

// Dentro de la función que maneja la finalización de cita
// Agregar después del modal de observaciones finales:

// **NUEVO**: Modal de Registro de Peso
const weightModal = document.querySelector('#weight-modal');
const petNameSpan = document.querySelector('#weight-pet-name');
const weightInput = document.querySelector('#weight-input');
const weightNotesInput = document.querySelector('#weight-notes-input');
const skipWeightBtn = document.querySelector('#skip-weight-btn');
const saveWeightBtn = document.querySelector('#save-weight-btn');

let currentPetId = null;
let currentCompletedAppointmentId = null;

// Función para abrir modal de peso después de completar cita
const openWeightModal = (appointment) => {
    currentPetId = appointment.pet_id;
    currentCompletedAppointmentId = appointment.id;
    petNameSpan.textContent = appointment.pets?.name || 'Mascota';
    weightInput.value = '';
    weightNotesInput.value = '';
    weightModal.classList.remove('hidden');
};

// Botón para omitir registro de peso
skipWeightBtn.addEventListener('click', () => {
    weightModal.classList.add('hidden');
    currentPetId = null;
    currentCompletedAppointmentId = null;
});

// Botón para guardar peso
saveWeightBtn.addEventListener('click', async () => {
    const weight = weightInput.value.trim();
    
    if (!weight || parseFloat(weight) <= 0) {
        alert('Por favor, ingresa un peso válido.');
        return;
    }

    const notes = weightNotesInput.value.trim();
    
    const result = await addWeightRecord(
        currentPetId,
        weight,
        currentCompletedAppointmentId,
        notes || null
    );

    if (result.success) {
        alert('Peso registrado exitosamente.');
        weightModal.classList.add('hidden');
        currentPetId = null;
        currentCompletedAppointmentId = null;
    } else {
        alert('Error al registrar el peso. Inténtalo nuevamente.');
    }
});

// Modificar la función de completar cita para mostrar modal de peso
// En el botón de "Completar":
confirmCompletionBtn.addEventListener('click', async () => {
    const observations = finalObservationsTextarea.value.trim();
    
    const result = await updateAppointmentStatus(
        currentAppointmentId,
        'completada',
        observations || null
    );

    if (result.success) {
        completionModal.classList.add('hidden');
        
        // **NUEVO**: Buscar datos de la cita para el modal de peso
        const appointment = allAppointments.find(apt => apt.id === currentAppointmentId);
        
        // Mostrar modal de peso
        openWeightModal(appointment);
        
        // Recargar tabla
        await loadAppointments();
    } else {
        alert('Error al finalizar la cita. Inténtalo nuevamente.');
    }
});