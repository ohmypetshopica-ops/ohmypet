// public/modules/dashboard/dashboard-calendar.js

import { supabase } from '../../core/supabase.js';

// 1. Importar funciones del CALENDARIO (desde su nuevo archivo)
import { 
    blockTimeSlot, 
    unblockTimeSlot,
    getMonthAppointments,
    getMonthBlockedSlots
} from './calendar.api.js';

// 2. Importar funciones de CLIENTES (para búsqueda en modal)
import { getClientsWithPets } from './clients.api.js';

// 3. Importar funciones de CITAS (para agendar y verificar disponibilidad puntual)
import { 
    addAppointmentFromDashboard,
    getBookedTimesForDashboard 
} from './appointments.api.js';


// --- ELEMENTOS DEL DOM CALENDAR ---
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const todayBtn = document.getElementById('today-btn');
const headerTitle = document.querySelector('#header-title');

// Modal de detalles de día
const dayDetailModal = document.getElementById('day-detail-modal');
const modalDate = document.getElementById('modal-date');
const timeSlotsContainer = document.getElementById('time-slots-container');
const closeModalBtn = document.getElementById('close-modal');

// --- ELEMENTOS DEL MODAL DE AGENDAR CITA ---
const addAppointmentModal = document.querySelector('#add-appointment-modal-calendar');
const addAppointmentForm = document.querySelector('#add-appointment-form-calendar');
const cancelAddAppointmentBtn = document.querySelector('#cancel-add-appointment-btn-calendar');
const submitAppointmentBtn = document.querySelector('#submit-appointment-btn-calendar');
const petSelect = document.querySelector('#pet-select-calendar');
const newAppointmentDateInput = document.querySelector('#new-appointment-date-calendar');
const newAppointmentTimeSelect = document.querySelector('#new-appointment-time-calendar');
const serviceSelect = document.querySelector('#service-select-calendar');
const serviceNotes = document.querySelector('#service-notes-calendar');
const addAppointmentMessage = document.querySelector('#add-appointment-message-calendar');
const clientSearchInputModal = document.querySelector('#client-search-input-modal-calendar');
const clientSearchResults = document.querySelector('#client-search-results-calendar');
const selectedClientIdInput = document.querySelector('#selected-client-id-calendar');

// --- ESTADO ---
let currentDate = new Date();
let appointments = [];
let blockedSlots = [];
let selectedDate = null;
let clientsWithPets = [];

// --- HORARIOS DISPONIBLES ---
const AVAILABLE_HOURS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00"
];


// --- FUNCIONES DEL CALENDARIO ---

/**
 * Renderiza el calendario del mes actual
 */
const renderCalendar = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Actualizar título
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;
    
    // Obtener datos del mes usando las nuevas funciones API
    [appointments, blockedSlots] = await Promise.all([
        getMonthAppointments(year, month),
        getMonthBlockedSlots(year, month)
    ]);
    
    // Calcular días del mes
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    calendarGrid.innerHTML = '';
    
    // Días del mes anterior (grises)
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayCell = createDayCell(day, true, year, month - 1);
        calendarGrid.appendChild(dayCell);
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = createDayCell(day, false, year, month);
        calendarGrid.appendChild(dayCell);
    }
    
    // Días del siguiente mes (grises) para completar la cuadrícula
    const totalCells = calendarGrid.children.length;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
        for (let day = 1; day <= remainingCells; day++) {
            const dayCell = createDayCell(day, true, year, month + 1);
            calendarGrid.appendChild(dayCell);
        }
    }
};

/**
 * Crea una celda de día del calendario
 */
const createDayCell = (day, isOtherMonth, year, month) => {
    const cell = document.createElement('div');
    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = dateStr === today;
    
    cell.className = `calendar-day p-3 border-b border-r border-gray-200 ${
        isOtherMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
    } ${isToday ? 'ring-2 ring-green-500' : ''}`;
    
    // Número del día
    const dayNumber = document.createElement('div');
    dayNumber.className = `text-sm font-semibold mb-2 ${
        isToday ? 'bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''
    }`;
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);
    
    if (!isOtherMonth) {
        // Obtener citas y bloqueos de este día
        const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
        const dayBlocked = blockedSlots.filter(slot => slot.blocked_date === dateStr);
        
        // Mostrar indicadores
        const indicators = document.createElement('div');
        indicators.className = 'flex flex-wrap gap-1';
        
        // Indicadores de citas
        dayAppointments.forEach(apt => {
            const dot = document.createElement('span');
            dot.className = 'appointment-dot';
            const statusColors = {
                'pendiente': 'bg-yellow-500',
                'confirmada': 'bg-blue-500',
                'completada': 'bg-green-500',
                'cancelada': 'bg-gray-400',
                'rechazada': 'bg-red-400'
            };
            dot.className += ` ${statusColors[apt.status] || 'bg-gray-500'}`;
            dot.title = `${apt.appointment_time} - ${apt.pets?.name}`;
            indicators.appendChild(dot);
        });
        
        // Indicadores de bloqueos
        dayBlocked.forEach(() => {
            const dot = document.createElement('span');
            dot.className = 'appointment-dot bg-red-500';
            dot.title = 'Horario bloqueado';
            indicators.appendChild(dot);
        });
        
        cell.appendChild(indicators);
        
        // Contador de citas
        if (dayAppointments.length > 0 || dayBlocked.length > 0) {
            const counter = document.createElement('div');
            counter.className = 'text-xs text-gray-600 mt-1';
            counter.textContent = `${dayAppointments.length} citas, ${dayBlocked.length} bloq.`;
            cell.appendChild(counter);
        }
        
        // Click para abrir modal
        cell.addEventListener('click', () => openDayDetailModal(dateStr));
    }
    
    return cell;
};

// --- LÓGICA DEL MODAL DE AGENDAR CITA ---

const openAddAppointmentModal = (dateStr, timeStr) => {
    // 1. Pre-seleccionar fecha y hora
    newAppointmentDateInput.value = dateStr;
    newAppointmentTimeSelect.innerHTML = `<option value="${timeStr}:00">${timeStr}</option>`;
    newAppointmentTimeSelect.value = `${timeStr}:00`;
    newAppointmentTimeSelect.disabled = false;
    
    // 2. Limpiar otros campos
    clientSearchInputModal.value = '';
    selectedClientIdInput.value = '';
    petSelect.innerHTML = '<option>Selecciona un cliente primero</option>';
    petSelect.disabled = true;
    serviceSelect.value = '';
    serviceNotes.value = '';
    addAppointmentMessage.classList.add('hidden');

    // 3. Ocultar modal de detalle y mostrar modal de agendar
    dayDetailModal.classList.add('hidden');
    addAppointmentModal.classList.remove('hidden');
};

const closeAddAppointmentModal = () => {
    addAppointmentModal.classList.add('hidden');
};

const populatePetSelect = (clientId) => {
    const selectedClient = clientsWithPets.find(c => c.id === clientId);

    if (selectedClient && selectedClient.pets.length > 0) {
        petSelect.innerHTML = '<option value="">Selecciona una mascota...</option>';
        selectedClient.pets.forEach(pet => {
            const option = new Option(pet.name, pet.id);
            petSelect.add(option);
        });
        petSelect.disabled = false;
    } else {
        petSelect.innerHTML = '<option>Este cliente no tiene mascotas registradas</option>';
        petSelect.disabled = true;
    }
};

const renderClientSearchResults = (clients) => {
    if (clients.length === 0) {
        clientSearchResults.innerHTML = `<div class="p-3 text-sm text-gray-500">No se encontraron clientes.</div>`;
    } else {
        clientSearchResults.innerHTML = clients.map(client => {
            const displayName = (client.first_name && client.last_name) ? `${client.first_name} ${client.last_name}` : client.full_name;
            return `<div class="p-3 hover:bg-gray-100 cursor-pointer text-sm" data-client-id="${client.id}" data-client-name="${displayName}">${displayName}</div>`;
        }).join('');
    }
    clientSearchResults.classList.remove('hidden');
};


// --- FUNCIONES DEL CALENDARIO - MODAL DE DETALLE DEL DÍA ---

/**
 * Abre el modal con los detalles del día, mostrando TODAS las citas por horario
 */
const openDayDetailModal = async (dateStr) => {
    selectedDate = dateStr;
    
    // Formatear fecha para el título
    const date = new Date(dateStr + 'T12:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    modalDate.textContent = date.toLocaleDateString('es-ES', options);
    
    // Obtener todas las citas del día
    const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
    // Obtener bloqueos del día
    const dayBlocked = blockedSlots.filter(slot => slot.blocked_date === dateStr);
    
    // Renderizar horarios
    timeSlotsContainer.innerHTML = '';
    
    // Validar tiempo actual para deshabilitar agendamiento en el pasado
    const now = new Date();
    now.setSeconds(0, 0); 

    AVAILABLE_HOURS.forEach(time => {
        // Filtrar todas las citas que empiecen a esta hora
        const appointmentsAtThisTime = dayAppointments.filter(apt => apt.appointment_time.startsWith(time));
        const blocked = dayBlocked.find(slot => slot.blocked_time.startsWith(time));
        
        const slot = document.createElement('div');
        slot.className = 'p-3 rounded-lg border-2 transition-all h-full flex flex-col';
        
        // Determinar si el slot de tiempo es pasado o actual
        const slotDateTime = new Date(`${dateStr}T${time}:00`);
        const isPastOrCurrent = slotDateTime <= now;

        
        if (appointmentsAtThisTime.length > 0) {
            // === ESCENARIO A: Hay una o más citas ===
            slot.className += ' border-gray-300 bg-white shadow-sm';
            
            let htmlContent = `
                <div class="font-bold text-lg mb-2 text-gray-800 border-b pb-1 flex justify-between items-center">
                    ${time}
                    <span class="text-xs font-normal bg-green-100 text-green-800 px-2 py-0.5 rounded-full">${appointmentsAtThisTime.length} cita(s)</span>
                </div>
                <div class="space-y-2 flex-1 overflow-y-auto max-h-40 pr-1 custom-scrollbar">
            `;

            appointmentsAtThisTime.forEach(appointment => {
                const ownerName = appointment.profiles?.first_name 
                    ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
                    : appointment.profiles?.full_name || 'Cliente';
                
                const statusColors = {
                    'pendiente': 'border-yellow-400 bg-yellow-50 text-yellow-900',
                    'confirmada': 'border-blue-400 bg-blue-50 text-blue-900',
                    'completada': 'border-green-400 bg-green-50 text-green-900',
                    'cancelada': 'border-gray-300 bg-gray-100 text-gray-500',
                    'rechazada': 'border-red-300 bg-red-50 text-red-800'
                };

                const colorClass = statusColors[appointment.status] || 'border-gray-200 bg-gray-50';

                // --- TARJETA DE CITA CLICKEABLE ---
                htmlContent += `
                    <div class="appointment-card p-2 rounded border-l-4 ${colorClass} text-xs cursor-pointer hover:opacity-80 transition-opacity"
                         data-id="${appointment.id}" 
                         data-status="${appointment.status}"
                         data-pet-name="${appointment.pets?.name || 'Mascota'}"
                         data-pet-id="${appointment.pet_id}">
                        <div class="font-bold truncate flex justify-between items-center">
                            <span>${appointment.pets?.name || 'Mascota'}</span>
                            <svg class="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </div>
                        <div class="truncate">${ownerName}</div>
                        <div class="uppercase font-semibold mt-1 opacity-75" style="font-size: 0.65rem;">${appointment.status}</div>
                    </div>
                `;
            });

            htmlContent += `</div>`;

            // Botón para agendar OTRA cita en el mismo horario (sobreturno)
            if (!isPastOrCurrent) {
                htmlContent += `
                    <div class="mt-3 pt-2 border-t border-gray-100">
                        <button class="schedule-btn w-full bg-green-600 text-white text-xs font-bold py-1.5 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1">
                            <span>+</span> Agendar Otra
                        </button>
                    </div>
                `;
            }

            slot.innerHTML = htmlContent;
            slot.style.cursor = 'default';

            // --- LISTENERS PARA LAS TARJETAS DE CITA ---
            slot.querySelectorAll('.appointment-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    e.stopPropagation(); // Evitar conflicto con el slot
                    const status = card.dataset.status;
                    const petName = card.dataset.petName;
                    
                    // Redirigir pasando Search (Nombre) y Date (Fecha) en la URL
                    if (status === 'completada') {
                        window.location.href = `/public/modules/dashboard/dashboard-services.html?search=${encodeURIComponent(petName)}&date=${dateStr}`;
                    } else {
                        window.location.href = `/public/modules/dashboard/dashboard-appointments.html?search=${encodeURIComponent(petName)}&date=${dateStr}`;
                    }
                });
            });

            // Listener para el botón de sobreturno
            const scheduleBtn = slot.querySelector('.schedule-btn');
            if (scheduleBtn) {
                scheduleBtn.addEventListener('click', () => {
                    openAddAppointmentModal(dateStr, time);
                });
            }

        } else if (blocked) {
            // === ESCENARIO B: Está bloqueado ===
            slot.className += ' blocked-slot border-red-500 bg-red-50';
            slot.innerHTML = `
                <div class="font-bold text-sm mb-1">${time}</div>
                <div class="text-xs text-red-700 font-bold mb-1">🚫 Bloqueado</div>
                <div class="text-xs text-gray-600 italic mb-2">${blocked.reason || 'Sin motivo'}</div>
                ${!isPastOrCurrent ? `
                    <div class="mt-auto">
                        <button class="unblock-btn w-full bg-red-500 text-white text-xs font-semibold py-1.5 rounded hover:bg-red-600 transition-colors">Desbloquear</button>
                    </div>
                ` : `<div class="mt-auto text-xs text-gray-400">Horario pasado</div>`}
            `;
            
            if (!isPastOrCurrent) {
                 slot.querySelector('.unblock-btn').addEventListener('click', async () => {
                    if (confirm(`¿Desbloquear el horario ${time}?`)) {
                        const result = await unblockTimeSlot(dateStr, time + ':00');
                        if (result.success) {
                            await renderCalendar();
                            openDayDetailModal(dateStr);
                        } else {
                            alert('Error al desbloquear horario');
                        }
                    }
                });
            }
           
        } else {
            // === ESCENARIO C: Disponible (Vacío) ===
            slot.className += ' border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer hover:shadow-md group';

            const blockButtonHTML = isPastOrCurrent ? '' : 
                `<button class="block-btn opacity-0 group-hover:opacity-100 bg-gray-500 text-white text-xs px-2 py-1 rounded hover:bg-gray-600 transition-all">Bloquear</button>`;
            
            slot.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="font-bold text-sm text-green-900">${time}</div>
                    ${blockButtonHTML}
                </div>
                <div class="flex-1 flex flex-col items-center justify-center py-4">
                    <span class="text-xs text-green-600 font-medium mb-2">✓ Disponible</span>
                    <button class="schedule-btn bg-green-600 text-white text-xs font-bold py-2 px-4 rounded-full hover:bg-green-700 shadow-sm transition-transform transform group-hover:scale-105">
                        Agendar Cita
                    </button>
                </div>
            `;
            
            // Listener principal para agendar (al hacer click en el botón verde)
            slot.querySelector('.schedule-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar conflicto con el contenedor si tuviera listener
                openAddAppointmentModal(dateStr, time);
            });
            
            // Listener para bloquear
            const blockBtn = slot.querySelector('.block-btn');
            if (blockBtn) {
                blockBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const reason = prompt(`Bloquear horario ${time}. Motivo (opcional):`, 'Bloqueado por administrador');
                    if (reason !== null) {
                        const result = await blockTimeSlot(dateStr, time + ':00', reason || 'Bloqueado por administrador');
                        if (result.success) {
                            await renderCalendar();
                            openDayDetailModal(dateStr);
                        } else {
                            alert('Error al bloquear horario');
                        }
                    }
                });
            }
        }
        
        timeSlotsContainer.appendChild(slot);
    });
    
    dayDetailModal.classList.remove('hidden');
};

/**
 * Cierra el modal de detalles de día
 */
const closeDayDetailModal = () => {
    dayDetailModal.classList.add('hidden');
};

// --- FUNCIÓN DE INICIALIZACIÓN DE LISTENERS ---

const setupAppointmentModalListeners = () => {
    // Escucha de eventos para el modal de agendar cita
    cancelAddAppointmentBtn?.addEventListener('click', closeAddAppointmentModal);

    addAppointmentModal?.addEventListener('click', (e) => {
        if (e.target === addAppointmentModal) closeAddAppointmentModal();
    });

    clientSearchInputModal?.addEventListener('input', () => {
        const searchTerm = clientSearchInputModal.value.toLowerCase();
        
        petSelect.innerHTML = '<option>Selecciona un cliente primero</option>';
        petSelect.disabled = true;
        selectedClientIdInput.value = '';

        if (searchTerm.length < 1) {
            clientSearchResults.classList.add('hidden');
            return;
        }

        const matchedClients = clientsWithPets.filter(client => {
            const fullName = ((client.first_name || '') + ' ' + (client.last_name || '')).toLowerCase();
            return fullName.includes(searchTerm);
        });

        renderClientSearchResults(matchedClients);
    });

    clientSearchResults?.addEventListener('click', (e) => {
        const clientDiv = e.target.closest('[data-client-id]');
        if (clientDiv) {
            const clientId = clientDiv.dataset.clientId;
            const clientName = clientDiv.dataset.clientName;

            clientSearchInputModal.value = clientName;
            selectedClientIdInput.value = clientId;

            clientSearchResults.classList.add('hidden');
            populatePetSelect(clientId);
        }
    });

    document.addEventListener('click', (e) => {
        if (!clientSearchInputModal?.contains(e.target) && !clientSearchResults?.contains(e.target)) {
            clientSearchResults.classList.add('hidden');
        }
    });

    addAppointmentForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitAppointmentBtn.disabled = true;
        submitAppointmentBtn.textContent = 'Agendando...';

        const formData = new FormData(addAppointmentForm);
        const serviceValue = formData.get('service');
        const notesValue = formData.get('notes');
        
        const appointmentData = {
            user_id: formData.get('user_id'),
            pet_id: formData.get('pet_id'),
            appointment_date: formData.get('appointment_date'),
            appointment_time: formData.get('appointment_time'),
            service: serviceValue,
            notes: notesValue || null,
            status: 'confirmada'
        };

        if (!appointmentData.user_id || !appointmentData.pet_id || !appointmentData.appointment_date || !appointmentData.appointment_time || !appointmentData.service) {
            alert('Por favor, completa todos los campos obligatorios.');
            submitAppointmentBtn.disabled = false;
            submitAppointmentBtn.textContent = 'Agendar Cita';
            return;
        }

        const { success, error } = await addAppointmentFromDashboard(appointmentData);

        if (success) {
            alert('¡Cita agendada con éxito!');
            
            try {
                const appointmentDateTime = new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`);
                const now = new Date();

                if (appointmentDateTime >= now) {
                    const client = clientsWithPets.find(c => c.id === appointmentData.user_id);
                    if (client && client.phone) {
                        const pet = client.pets.find(p => p.id === appointmentData.pet_id);
                        const petName = pet ? pet.name : 'su mascota';
                        const appointmentDate = new Date(appointmentData.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        
                        const message = `¡Hola ${client.first_name}! 👋 Te confirmamos tu cita en OhMyPet:\n\n*Mascota:* ${petName}\n*Fecha:* ${appointmentDate}\n*Hora:* ${appointmentData.appointment_time}\n*Servicio:* ${appointmentData.service}\n\n¡Te esperamos! 🐾`;
                        
                        const whatsappUrl = `https://wa.me/51${client.phone}?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                    }
                }
            } catch (e) {
                console.error('Error al intentar enviar WhatsApp:', e);
            }

            closeAddAppointmentModal();
            await renderCalendar();
            if (!dayDetailModal.classList.contains('hidden')) {
                openDayDetailModal(appointmentData.appointment_date);
            }

        } else {
            addAppointmentMessage.textContent = `Error: ${error.message}`;
            addAppointmentMessage.className = 'p-3 rounded-md bg-red-100 text-red-700 text-sm';
            addAppointmentMessage.classList.remove('hidden');
        }

        submitAppointmentBtn.disabled = false;
        submitAppointmentBtn.textContent = 'Agendar Cita';
    });
}


// --- EVENT LISTENERS ---
prevMonthBtn.addEventListener('click', async () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    await renderCalendar();
});

nextMonthBtn.addEventListener('click', async () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    await renderCalendar();
});

todayBtn.addEventListener('click', async () => {
    currentDate = new Date();
    await renderCalendar();
});

closeModalBtn.addEventListener('click', closeDayDetailModal);

dayDetailModal.addEventListener('click', (e) => {
    if (e.target === dayDetailModal) {
        closeDayDetailModal();
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Calendario de Citas';
    }
    
    clientsWithPets = await getClientsWithPets();
    setupAppointmentModalListeners();
    newAppointmentDateInput.min = new Date().toISOString().split("T")[0];
    
    await renderCalendar();
});