// public/modules/profile/my-appointments.js

import { supabase, getUserAppointments, cancelAppointment, getBookedTimes, rescheduleAppointment, getUserProfile } from './profile.api.js';

// --- INICIO: TODA LA LÓGICA AHORA ESTÁ DENTRO DE ESTE BLOQUE ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SELECCIÓN DE ELEMENTOS (Ahora de forma segura) ---
    const appointmentsContainer = document.querySelector('#appointments-container');
    // Modal de reprogramación
    const rescheduleModal = document.querySelector('#reschedule-modal');
    const closeModalBtn = document.querySelector('#close-modal-btn');
    const dateInput = document.querySelector('#reschedule-date');
    const timeOptionsContainer = document.querySelector('#reschedule-time-options');
    const confirmRescheduleBtn = document.querySelector('#confirm-reschedule-btn');
    // Modal de detalles de cita completada
    const detailsModal = document.querySelector('#details-modal');
    const closeDetailsModalBtn = document.querySelector('#close-details-modal-btn');
    const modalPetName = document.querySelector('#modal-pet-name');
    const modalArrivalPhoto = document.querySelector('#modal-arrival-photo');
    const modalDeparturePhoto = document.querySelector('#modal-departure-photo');
    const modalStylistNotes = document.querySelector('#modal-stylist-notes');

    // --- 2. ESTADO DE LA APLICACIÓN ---
    let allAppointments = [];
    let selectedTime = null;
    let appointmentToRescheduleId = null;
    let clientFullName = 'Cliente';
    let petNameForReschedule = '';

    // --- 3. DEFINICIÓN DE FUNCIONES ---

    // Lógica del Modal de Reprogramación
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
                    timeOptionsContainer.querySelector('.bg-green-700')?.classList.remove('bg-green-700', 'text-white');
                    btn.classList.add('bg-green-700', 'text-white');
                    selectedTime = hour;
                    confirmRescheduleBtn.disabled = false;
                };
            }
            timeOptionsContainer.appendChild(btn);
        });
    };

    // Lógica del Modal de Detalles
    const openDetailsModal = (appointment) => {
        const petName = appointment.pets?.name || 'Mascota';
        const photos = appointment.appointment_photos || [];
        const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
        const departurePhoto = photos.find(p => p.photo_type === 'departure');
        
        modalPetName.textContent = `Servicio para ${petName}`;
        modalStylistNotes.textContent = appointment.final_observations || 'No se dejaron observaciones.';

        const placeholder = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        modalArrivalPhoto.src = arrivalPhoto ? arrivalPhoto.image_url : placeholder;
        modalDeparturePhoto.src = departurePhoto ? departurePhoto.image_url : placeholder;
        
        detailsModal.classList.remove('hidden');
        setTimeout(() => detailsModal.classList.remove('modal-enter-from'), 10);
    };
    const closeDetailsModal = () => {
        detailsModal.classList.add('modal-enter-from');
        setTimeout(() => detailsModal.classList.add('hidden'), 300);
    };

    // Renderizado de la tarjeta de cita
    const createAppointmentCard = (appointment) => {
        const petName = appointment.pets?.name || 'Mascota';
        const petImage = appointment.pets?.image_url || 'https://via.placeholder.com/150';
        const status = (appointment.status || 'pendiente').toLowerCase();
        
        const canTakeAction = ['pendiente', 'confirmada'].includes(status);
        const canViewDetails = status === 'completada';

        const statusStyles = {
            pendiente: { text: 'Pendiente', bg: 'bg-yellow-100', text_color: 'text-yellow-800' },
            confirmada: { text: 'Confirmada', bg: 'bg-blue-100', text_color: 'text-blue-800' },
            completada: { text: 'Completada', bg: 'bg-green-100', text_color: 'text-green-800' },
            cancelada: { text: 'Cancelada', bg: 'bg-red-100', text_color: 'text-red-800' },
            rechazada: { text: 'Rechazada', bg: 'bg-gray-100', text_color: 'text-gray-800' }
        };
        const currentStyle = statusStyles[status] || statusStyles.pendiente;

        let actionButtons = '';
        if (canTakeAction) {
            actionButtons = `
                <button data-appointment-id="${appointment.id}" data-pet-name="${petName}" class="reschedule-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Reprogramar</button>
                <button data-appointment-id="${appointment.id}" class="cancel-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Cancelar</button>
            `;
        } else if (canViewDetails) {
            actionButtons = `<button data-appointment-id="${appointment.id}" class="view-details-btn bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Ver Resultado</button>`;
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
                    <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:self-center">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    };

    // Carga de datos principal
    const loadAppointments = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profile, appointmentsData] = await Promise.all([ getUserProfile(user.id), getUserAppointments(user.id) ]);
        
        if (profile) {
            clientFullName = (profile.first_name && profile.last_name) ? `${profile.first_name} ${profile.last_name}` : profile.full_name;
        }

        allAppointments = appointmentsData; 

        if (allAppointments && allAppointments.length > 0) {
            appointmentsContainer.innerHTML = allAppointments.map(createAppointmentCard).join('');
        } else {
            appointmentsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Aún no tienes ninguna cita registrada.</p>';
        }
    };

    // --- 4. ASIGNACIÓN DE EVENT LISTENERS ---

    // Listener para el input de fecha en el modal de reprogramación
    dateInput.addEventListener('change', async () => {
        const selectedDate = dateInput.value;
        if (!selectedDate) return;
        timeOptionsContainer.innerHTML = '<p class="text-sm text-gray-500">Cargando...</p>';
        const bookedTimes = await getBookedTimes(selectedDate);
        renderTimeOptions(bookedTimes);
        selectedTime = null;
        confirmRescheduleBtn.disabled = true;
    });

    // Listener para los botones de acción en las tarjetas de cita
    appointmentsContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        
        const appointmentId = target.dataset.appointmentId;

        if (target.classList.contains('cancel-btn')) {
            if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
                const { success } = await cancelAppointment(appointmentId);
                if (success) { loadAppointments(); }
            }
        } else if (target.classList.contains('reschedule-btn')) {
            const petName = target.dataset.petName;
            openModal(appointmentId, petName);
        } else if (target.classList.contains('view-details-btn')) {
            const appointment = allAppointments.find(app => app.id == appointmentId);
            if (appointment) openDetailsModal(appointment);
        }
    });

    // Listeners para cerrar los modales
    closeModalBtn.addEventListener('click', closeModal);
    rescheduleModal.addEventListener('click', (e) => { if (e.target === rescheduleModal) closeModal(); });

    closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
    detailsModal.addEventListener('click', (e) => { if (e.target === detailsModal) closeDetailsModal(); });


    // --- 5. INICIALIZACIÓN DE LA PÁGINA ---
    loadAppointments();
});
// --- FIN DEL BLOQUE PRINCIPAL ---