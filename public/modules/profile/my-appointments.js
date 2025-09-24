import { supabase, getUserAppointments, cancelAppointment, getBookedTimes, rescheduleAppointment, getUserProfile } from './profile.api.js';

// --- ELEMENTOS DEL DOM ---
const appointmentsContainer = document.querySelector('#appointments-container');

// --- ELEMENTOS DEL MODAL ---
const rescheduleModal = document.querySelector('#reschedule-modal');
const closeModalBtn = document.querySelector('#close-modal-btn');
const dateInput = document.querySelector('#reschedule-date');
const timeOptionsContainer = document.querySelector('#reschedule-time-options');
const confirmRescheduleBtn = document.querySelector('#confirm-reschedule-btn');

// --- ESTADO ---
let selectedTime = null;
let appointmentToRescheduleId = null;
let clientFullName = 'Cliente'; // Nombre por defecto
let petNameForReschedule = '';


// --- LÓGICA DEL MODAL ---

const openModal = (appointmentId, petName) => {
    appointmentToRescheduleId = appointmentId;
    petNameForReschedule = petName;
    dateInput.value = '';
    timeOptionsContainer.innerHTML = '<p class="text-sm text-gray-500">Selecciona una fecha para ver los horarios disponibles.</p>';
    selectedTime = null;
    confirmRescheduleBtn.disabled = true;
    dateInput.min = new Date().toISOString().split("T")[0];
    rescheduleModal.classList.remove('hidden');
};

const closeModal = () => {
    rescheduleModal.classList.add('hidden');
};

const renderTimeOptions = (bookedTimes = []) => {
    const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
    timeOptionsContainer.innerHTML = '';
    hours.forEach(hour => {
        const isBooked = bookedTimes.includes(hour);
        const btn = document.createElement("button");
        btn.textContent = hour;
        btn.disabled = isBooked;
        
        if (isBooked) {
            btn.className = "option-btn bg-gray-200 text-gray-400 px-4 py-2 rounded-lg cursor-not-allowed line-through";
        } else {
            btn.className = "option-btn bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-200 font-medium";
            btn.onclick = () => {
                const currentSelected = timeOptionsContainer.querySelector('.bg-green-700');
                if (currentSelected) {
                    currentSelected.classList.remove('bg-green-700', 'text-white');
                }
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
    
    timeOptionsContainer.innerHTML = '<p class="text-sm text-gray-500">Cargando disponibilidad...</p>';
    const bookedTimes = await getBookedTimes(selectedDate);
    renderTimeOptions(bookedTimes);
    selectedTime = null;
    confirmRescheduleBtn.disabled = true;
});

confirmRescheduleBtn.addEventListener('click', async () => {
    if (!appointmentToRescheduleId || !dateInput.value || !selectedTime) {
        alert('Por favor, selecciona una nueva fecha y hora.');
        return;
    }
    
    confirmRescheduleBtn.disabled = true;
    confirmRescheduleBtn.textContent = 'Procesando...';

    const { success, error } = await rescheduleAppointment(appointmentToRescheduleId, dateInput.value, selectedTime);

    if (success) {
        // Construir y enviar el mensaje de WhatsApp
        const message = `*¡Solicitud de Reprogramación OhMyPet!*\n(Ya actualizada en el sistema)\n\n*Cliente:* ${clientFullName}\n*Mascota:* ${petNameForReschedule}\n*NUEVA Fecha:* ${dateInput.value}\n*NUEVA Hora:* ${selectedTime}\n\nPor favor, confirmar la disponibilidad.`;
        const phoneNumber = "51904343849"; // Número de la tienda
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, "_blank");
        
        alert('¡Solicitud de reprogramación enviada! En breve la tienda confirmará la nueva fecha.');
        closeModal();
        loadAppointments();
    } else {
        alert(`Hubo un error al reprogramar: ${error.message}`);
    }

    confirmRescheduleBtn.disabled = false;
    confirmRescheduleBtn.textContent = 'Confirmar Reprogramación';
});


// --- RENDERIZADO DE CITAS ---
const createAppointmentCard = (appointment) => {
    const petName = appointment.pets?.name || 'Mascota no especificada';
    const petImage = appointment.pets?.image_url || 'https://via.placeholder.com/150';

    const statusStyles = { pendiente: { text: 'Pendiente', bg: 'bg-yellow-100', text_color: 'text-yellow-800' }, confirmada: { text: 'Confirmada', bg: 'bg-blue-100', text_color: 'text-blue-800' }, completada: { text: 'Completada', bg: 'bg-green-100', text_color: 'text-green-800' }, cancelada: { text: 'Cancelada', bg: 'bg-red-100', text_color: 'text-red-800' }, rechazada: { text: 'Rechazada', bg: 'bg-gray-100', text_color: 'text-gray-800' } };
    const status = (appointment.status || 'pendiente').toLowerCase();
    const currentStyle = statusStyles[status] || statusStyles.pendiente;
    const canCancel = ['pendiente', 'confirmada'].includes(status);

    return `
        <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img src="${petImage}" alt="Foto de ${petName}" class="h-20 w-20 rounded-full object-cover border-2 border-green-200">
            <div class="flex-grow">
                <div class="flex justify-between items-center flex-wrap gap-2">
                    <p class="text-lg font-bold text-gray-800">${petName}</p>
                    <span class="text-sm font-medium ${currentStyle.bg} ${currentStyle.text_color} px-2 py-1 rounded-full">${currentStyle.text}</span>
                </div>
                <p class="text-gray-600 mt-1 font-semibold">${appointment.appointment_date} a las ${appointment.appointment_time}</p>
                <p class="text-sm text-gray-500 mt-2">${appointment.service || 'Servicio de estética general.'}</p>
            </div>
            ${canCancel ? `
            <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button data-appointment-id="${appointment.id}" data-pet-name="${petName}" class="reschedule-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                    Reprogramar
                </button>
                <button data-appointment-id="${appointment.id}" class="cancel-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                    Cancelar
                </button>
            </div>
            ` : ''}
        </div>
    `;
};

// --- FUNCIÓN PARA CARGAR LOS DATOS ---
const loadAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Obtenemos el perfil y las citas en paralelo para más eficiencia
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

// --- MANEJO DE EVENTOS (CANCELAR / REPROGRAMAR) ---
appointmentsContainer.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    const appointmentId = target.dataset.appointmentId;

    if (target.classList.contains('cancel-btn')) {
        if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
            const { success, error } = await cancelAppointment(appointmentId);
            if (success) {
                alert('¡Cita cancelada con éxito!');
                loadAppointments();
            } else {
                alert(`Hubo un error al cancelar la cita: ${error.message}`);
            }
        }
    } else if (target.classList.contains('reschedule-btn')) {
        const petName = target.dataset.petName;
        openModal(appointmentId, petName);
    }
});

// Eventos para cerrar el modal
closeModalBtn.addEventListener('click', closeModal);
rescheduleModal.addEventListener('click', (e) => {
    if (e.target === rescheduleModal) {
        closeModal();
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadAppointments);