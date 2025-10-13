// public/modules/profile/my-appointments.js
// VERSIÓN CORREGIDA CON VERIFICACIÓN DE SEGURIDAD PARA FOTOS

import { supabase, getUserAppointments, cancelAppointment, getBookedTimes, rescheduleAppointment, getUserProfile } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const appointmentsContainer = document.querySelector('#appointments-container');
const rescheduleModal = document.querySelector('#reschedule-modal');
const closeModalBtn = document.querySelector('#close-modal-btn');
const dateInput = document.querySelector('#reschedule-date');
const timeOptionsContainer = document.querySelector('#reschedule-time-options');
const confirmRescheduleBtn = document.querySelector('#confirm-reschedule-btn');

// --- ESTADO ---
let selectedTime = null;
let appointmentToRescheduleId = null;
let clientFullName = 'Cliente';
let petNameForReschedule = '';

// --- LÓGICA DEL MODAL (sin cambios) ---
const openModal = (appointmentId, petName) => {
    appointmentToRescheduleId = appointmentId;
    petNameForReschedule = petName;
    dateInput.value = '';
    timeOptionsContainer.innerHTML = '<p class="text-sm text-gray-500">Selecciona una fecha para ver los horarios.</p>';
    selectedTime = null;
    confirmRescheduleBtn.disabled = true;
    dateInput.min = new Date().toISOString().split("T")[0];
    rescheduleModal.classList.remove('hidden');
};
const closeModal = () => rescheduleModal.classList.add('hidden');
const renderTimeOptions = (bookedTimes = []) => {
    const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
    timeOptionsContainer.innerHTML = '';
    hours.forEach(hour => {
        const isBooked = bookedTimes.includes(hour);
        const btn = document.createElement("button");
        btn.textContent = hour;
        btn.disabled = isBooked;
        btn.className = isBooked ? "option-btn bg-gray-200 text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed line-through" : "option-btn bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 font-medium";
        if (!isBooked) {
            btn.onclick = () => {
                const currentSelected = timeOptionsContainer.querySelector('.bg-green-700');
                if (currentSelected) currentSelected.classList.remove('bg-green-700', 'text-white');
                btn.classList.add('bg-green-700', 'text-white');
                selectedTime = hour;
                confirmRescheduleBtn.disabled = false;
            };
        }
        timeOptionsContainer.appendChild(btn);
    });
};
dateInput.addEventListener('change', async () => {
    const selectedDate = dateInput.value;
    if (!selectedDate) return;
    timeOptionsContainer.innerHTML = '<p class="text-sm text-gray-500">Cargando...</p>';
    const bookedTimes = await getBookedTimes(selectedDate);
    renderTimeOptions(bookedTimes);
    selectedTime = null;
    confirmRescheduleBtn.disabled = true;
});
confirmRescheduleBtn.addEventListener('click', async () => {
    if (!appointmentToRescheduleId || !dateInput.value || !selectedTime) return alert('Por favor, selecciona una nueva fecha y hora.');
    confirmRescheduleBtn.disabled = true;
    confirmRescheduleBtn.textContent = 'Procesando...';
    const { success, error } = await rescheduleAppointment(appointmentToRescheduleId, dateInput.value, selectedTime);
    if (success) {
        const message = `*¡Solicitud de Reprogramación OhMyPet!*\n(Ya actualizada en el sistema)\n\n*Cliente:* ${clientFullName}\n*Mascota:* ${petNameForReschedule}\n*NUEVA Fecha:* ${dateInput.value}\n*NUEVA Hora:* ${selectedTime}\n\nPor favor, confirmar la disponibilidad.`;
        const phoneNumber = "51904343849";
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
        alert('¡Solicitud de reprogramación enviada!');
        closeModal();
        loadAppointments();
    } else {
        alert(`Hubo un error al reprogramar: ${error.message}`);
    }
    confirmRescheduleBtn.disabled = false;
    confirmRescheduleBtn.textContent = 'Confirmar Reprogramación';
});

// --- RENDERIZADO DE CITAS (FUNCIÓN MEJORADA) ---
const createAppointmentCard = (appointment) => {
    const petName = appointment.pets?.name || 'Mascota';
    const petImage = appointment.pets?.image_url || 'https://via.placeholder.com/150';
    const status = (appointment.status || 'pendiente').toLowerCase();
    const canCancel = ['pendiente', 'confirmada'].includes(status);
    
    const statusStyles = {
        pendiente: { text: 'Pendiente', bg: 'bg-yellow-100', text_color: 'text-yellow-800' },
        confirmada: { text: 'Confirmada', bg: 'bg-blue-100', text_color: 'text-blue-800' },
        completada: { text: 'Completada', bg: 'bg-green-100', text_color: 'text-green-800' },
        cancelada: { text: 'Cancelada', bg: 'bg-red-100', text_color: 'text-red-800' },
        rechazada: { text: 'Rechazada', bg: 'bg-gray-100', text_color: 'text-gray-800' }
    };
    const currentStyle = statusStyles[status] || statusStyles.pendiente;

    let completedContent = '';
    if (status === 'completada') {
        // ================ INICIO DE LA CORRECCIÓN ===================
        // Añadimos una verificación: si 'appointment_photos' no existe, lo tratamos como una lista vacía.
        const photos = appointment.appointment_photos || []; 
        // ================= FIN DE LA CORRECCIÓN =====================

        const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
        const departurePhoto = photos.find(p => p.photo_type === 'departure');

        completedContent = `
            <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-700 mb-2">Resultado del Servicio:</h4>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <img src="${arrivalPhoto ? arrivalPhoto.image_url : 'https://via.placeholder.com/150/F3F4F6/9CA3AF?text=Antes'}" alt="Foto de llegada" class="rounded-lg object-cover w-full h-32">
                                <p class="text-xs text-center text-gray-500 mt-1">Llegada</p>
                            </div>
                            <div>
                                <img src="${departurePhoto ? departurePhoto.image_url : 'https://via.placeholder.com/150/F3F4F6/9CA3AF?text=Despu%C3%A9s'}" alt="Foto de salida" class="rounded-lg object-cover w-full h-32">
                                <p class="text-xs text-center text-gray-500 mt-1">Salida</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-700 mb-2">Notas del Estilista:</h4>
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 h-full">
                            <p class="text-sm text-gray-800">${appointment.final_observations || 'No se dejaron observaciones.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <img src="${petImage}" alt="Foto de ${petName}" class="h-20 w-20 rounded-full object-cover border-2 border-green-200">
                <div class="flex-grow">
                    <div class="flex justify-between items-center flex-wrap gap-2">
                        <p class="text-lg font-bold text-gray-800">${petName}</p>
                        <span class="text-sm font-medium ${currentStyle.bg} ${currentStyle.text_color} px-2 py-1 rounded-full">${currentStyle.text}</span>
                    </div>
                    <p class="text-gray-600 mt-1 font-semibold">${appointment.appointment_date} a las ${appointment.appointment_time}</p>
                    <p class="text-sm text-gray-500 mt-2">${appointment.service || 'Servicio de estética.'}</p>
                </div>
                ${canCancel ? `
                <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:self-center">
                    <button data-appointment-id="${appointment.id}" data-pet-name="${petName}" class="reschedule-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Reprogramar</button>
                    <button data-appointment-id="${appointment.id}" class="cancel-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                </div>` : ''}
            </div>
            ${completedContent}
        </div>
    `;
};


// --- FUNCIÓN PARA CARGAR DATOS ---
const loadAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profile, appointments] = await Promise.all([
        getUserProfile(user.id),
        getUserAppointments(user.id)
    ]);
    
    if (profile) {
        clientFullName = (profile.first_name && profile.last_name) 
            ? `${profile.first_name} ${profile.last_name}`
            : profile.full_name;
    }

    if (appointments && appointments.length > 0) {
        appointmentsContainer.innerHTML = appointments.map(createAppointmentCard).join('');
    } else {
        appointmentsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Aún no tienes ninguna cita registrada.</p>';
    }
};

// --- MANEJO DE EVENTOS ---
appointmentsContainer.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    const appointmentId = target.dataset.appointmentId;
    if (target.classList.contains('cancel-btn')) {
        if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
            const { success } = await cancelAppointment(appointmentId);
            if (success) {
                alert('¡Cita cancelada!');
                loadAppointments();
            }
        }
    } else if (target.classList.contains('reschedule-btn')) {
        const petName = target.dataset.petName;
        openModal(appointmentId, petName);
    }
});
closeModalBtn.addEventListener('click', closeModal);
rescheduleModal.addEventListener('click', (e) => {
    if (e.target === rescheduleModal) closeModal();
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadAppointments);