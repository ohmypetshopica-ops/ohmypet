// public/modules/profile/my-appointments.js
import { supabase, getUserAppointments, cancelAppointment, getBookedTimes, rescheduleAppointment, getUserProfile } from './profile.api.js';

document.addEventListener('DOMContentLoaded', () => {

    const appointmentsContainer = document.querySelector('#appointments-container');
    const rescheduleModal = document.querySelector('#reschedule-modal');
    const closeRescheduleModalBtn = document.querySelector('#close-reschedule-modal-btn');
    const dateInput = document.querySelector('#reschedule-date');
    const timeOptionsContainer = document.querySelector('#reschedule-time-options');
    const confirmRescheduleBtn = document.querySelector('#confirm-reschedule-btn');
    const detailsModal = document.querySelector('#details-modal');
    const closeDetailsModalBtn = document.querySelector('#close-details-modal-btn');
    const modalPetName = document.querySelector('#modal-pet-name');
    const modalArrivalPhoto = document.querySelector('#modal-arrival-photo');
    const modalDeparturePhoto = document.querySelector('#modal-departure-photo');
    const modalStylistNotes = document.querySelector('#modal-stylist-notes');
    const modalShampooType = document.querySelector('#modal-shampoo-type');

    let allAppointments = [];
    let selectedTime = null;
    let appointmentToRescheduleId = null;
    let clientFullName = 'Cliente';
    let petNameForReschedule = '';

    const openModal = (appointmentId, petName) => {
        appointmentToRescheduleId = appointmentId;
        petNameForReschedule = petName;
        rescheduleModal.classList.remove('hidden');
        dateInput.value = '';
        timeOptionsContainer.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">Selecciona una fecha para ver horarios.</p>';
        confirmRescheduleBtn.disabled = true;
    };

    const closeModal = () => {
        rescheduleModal.classList.add('hidden');
        appointmentToRescheduleId = null;
    };

    const renderTimeOptions = (bookedTimes = []) => {
        const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
        timeOptionsContainer.innerHTML = '';
        selectedTime = null;
        confirmRescheduleBtn.disabled = true;

        hours.forEach(hour => {
            const isBooked = bookedTimes.includes(hour);
            const btn = document.createElement("button");
            btn.textContent = hour;
            btn.disabled = isBooked;
            btn.className = isBooked
                ? "option-btn bg-gray-200 text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed line-through"
                : "option-btn bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 font-medium transition-colors duration-200";

            if (!isBooked) {
                btn.onclick = () => {
                    document.querySelectorAll("#reschedule-time-options .option-btn").forEach(b => b.classList.remove("bg-green-700", "text-white"));
                    btn.classList.add("bg-green-700", "text-white");
                    selectedTime = hour;
                    confirmRescheduleBtn.disabled = false;
                };
            }
            timeOptionsContainer.appendChild(btn);
        });
    };
    
    const openDetailsModal = (appointment) => {
        const petName = appointment.pets?.name || 'Mascota';
        const photos = appointment.appointment_photos || [];
        const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
        const departurePhoto = photos.find(p => p.photo_type === 'departure');

        modalPetName.textContent = `Servicio para ${petName}`;
        modalStylistNotes.textContent = appointment.final_observations || 'No se dejaron observaciones.';
        modalShampooType.textContent = appointment.shampoo_type || 'General';
        
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

    const createAppointmentCard = (appointment) => {
        const petName = appointment.pets?.name || 'Mascota';
        const petImage = appointment.pets?.image_url || `https://via.placeholder.com/150/A4D0A4/FFFFFF?text=${petName.charAt(0)}`;
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
            </div>`;
    };

    const loadAppointments = async () => {
        appointmentsContainer.innerHTML = '';
        const skeletonTemplate = document.querySelector('#appointment-card-skeleton');
        if (skeletonTemplate) {
            for (let i = 0; i < 3; i++) {
                appointmentsContainer.append(skeletonTemplate.content.cloneNode(true));
            }
        } else {
            appointmentsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Cargando tus citas...</p>';
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profile, appointmentsData] = await Promise.all([
            getUserProfile(user.id),
            getUserAppointments(user.id)
        ]);
        
        if (profile) {
            clientFullName = (profile.first_name && profile.last_name) ? `${profile.first_name} ${profile.last_name}` : profile.full_name;
        }

        allAppointments = appointmentsData;

        appointmentsContainer.innerHTML = ''; 

        if (allAppointments && allAppointments.length > 0) {
            appointmentsContainer.innerHTML = allAppointments.map(createAppointmentCard).join('');
        } else {
            appointmentsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Aún no tienes ninguna cita registrada.</p>';
        }
    };
    
    if (dateInput) {
        dateInput.min = new Date().toISOString().split("T")[0];
        dateInput.addEventListener('change', async () => {
            const selectedDate = dateInput.value;
            if (!selectedDate) {
                renderTimeOptions([]);
                return;
            }
            timeOptionsContainer.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">Cargando disponibilidad...</p>';
            const bookedTimes = await getBookedTimes(selectedDate);
            renderTimeOptions(bookedTimes);
        });
    }

    if (appointmentsContainer) {
        appointmentsContainer.addEventListener('click', async (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            const appointmentId = target.dataset.appointmentId;
            if (target.classList.contains('cancel-btn')) {
                if (confirm('¿Estás seguro de que quieres cancelar esta cita? La cancelación no se puede deshacer.')) {
                    const { success } = await cancelAppointment(appointmentId);
                    if (success) {
                        alert('Cita cancelada exitosamente.');
                        loadAppointments();
                    } else {
                        alert('Hubo un error al cancelar la cita.');
                    }
                }
            } else if (target.classList.contains('reschedule-btn')) {
                const petName = target.dataset.petName;
                openModal(appointmentId, petName);
            } else if (target.classList.contains('view-details-btn')) {
                const appointment = allAppointments.find(app => app.id == appointmentId);
                if (appointment) openDetailsModal(appointment);
            }
        });
    }
    
    if (closeRescheduleModalBtn) closeRescheduleModalBtn.addEventListener('click', closeModal);
    if (rescheduleModal) rescheduleModal.addEventListener('click', (e) => { if (e.target === rescheduleModal) closeModal(); });
    
    if (closeDetailsModalBtn) closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
    if (detailsModal) detailsModal.addEventListener('click', (e) => { if (e.target === detailsModal) closeDetailsModal(); });

    if (confirmRescheduleBtn) {
        confirmRescheduleBtn.addEventListener('click', async () => {
            if (!appointmentToRescheduleId || !dateInput.value || !selectedTime) {
                alert('Por favor, selecciona una nueva fecha y hora.');
                return;
            }
            
            const { success, error } = await rescheduleAppointment(appointmentToRescheduleId, dateInput.value, selectedTime);
            if (success) {
                alert('¡Cita reprogramada con éxito! Hemos notificado al personal.');
                
                const message = `*¡Solicitud de Reprogramación OhMyPet!*\n(Ya registrada en el sistema)\n\n*Cliente:* ${clientFullName}\n*Mascota:* ${petNameForReschedule}\n*Nueva Fecha:* ${dateInput.value}\n*Nueva Hora:* ${selectedTime}`;
                const phoneNumber = "51904343849";
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, "_blank");

                closeModal();
                loadAppointments();
            } else {
                alert(`Error al reprogramar: ${error.message}`);
            }
        });
    }

    loadAppointments();
});