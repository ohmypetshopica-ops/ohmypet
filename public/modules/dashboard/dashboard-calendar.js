// public/modules/dashboard/dashboard-calendar.js

import { supabase } from '../../core/supabase.js';
import { 
    getClientsWithPets, 
    getBookedTimesForDashboard, 
    addAppointmentFromDashboard 
} from './dashboard.api.js';

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

// --- FUNCIONES DE API (sin cambios, solo importadas) ---

/**
 * Obtiene todas las citas de un mes específico
 */
const getMonthAppointments = async (year, month) => {
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, 
            appointment_date, 
            appointment_time, 
            service, 
            status,
            pets ( name ),
            profiles ( full_name, first_name, last_name )
        `)
        .gte('appointment_date', firstDay)
        .lte('appointment_date', lastDay)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
    
    if (error) {
        console.error('Error al obtener citas:', error);
        return [];
    }
    return data || [];
};

/**
 * Obtiene todos los horarios bloqueados de un mes
 */
const getMonthBlockedSlots = async (year, month) => {
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('blocked_slots')
        .select('*')
        .gte('blocked_date', firstDay)
        .lte('blocked_date', lastDay)
        .order('blocked_date', { ascending: true })
        .order('blocked_time', { ascending: true });
    
    if (error) {
        console.error('Error al obtener horarios bloqueados:', error);
        return [];
    }
    return data || [];
};

/**
 * Bloquea un horario específico
 */
const blockTimeSlot = async (date, time, reason = 'Bloqueado por administrador') => {
    const { data, error } = await supabase
        .from('blocked_slots')
        .insert([{
            blocked_date: date,
            blocked_time: time,
            reason: reason
        }])
        .select();
    
    if (error) {
        console.error('Error al bloquear horario:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

/**
 * Desbloquea un horario específico
 */
const unblockTimeSlot = async (date, time) => {
    const { data, error } = await supabase
        .from('blocked_slots')
        .delete()
        .eq('blocked_date', date)
        .eq('blocked_time', time)
        .select();
    
    if (error) {
        console.error('Error al desbloquear horario:', error);
        return { success: false, error };
    }
    return { success: true };
};


// --- FUNCIONES DEL CALENDARIO (createDayCell y renderCalendar se mantienen igual) ---

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
    
    // Obtener datos del mes
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
            counter.textContent = `${dayAppointments.length} citas, ${dayBlocked.length} bloqueados`;
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


// --- FUNCIONES DEL CALENDARIO - CONTINUACIÓN ---

/**
 * Abre el modal con los detalles del día
 */
const openDayDetailModal = async (dateStr) => {
    selectedDate = dateStr;
    
    // Formatear fecha para el título
    const date = new Date(dateStr + 'T12:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    modalDate.textContent = date.toLocaleDateString('es-ES', options);
    
    // Obtener citas y bloqueos del día
    const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
    const dayBlocked = blockedSlots.filter(slot => slot.blocked_date === dateStr);
    
    // Renderizar horarios
    timeSlotsContainer.innerHTML = '';
    
    AVAILABLE_HOURS.forEach(time => {
        const appointment = dayAppointments.find(apt => apt.appointment_time.startsWith(time));
        const blocked = dayBlocked.find(slot => slot.blocked_time.startsWith(time));
        
        const slot = document.createElement('div');
        slot.className = 'p-3 rounded-lg border-2 transition-all';
        
        if (appointment) {
            // Hay una cita - Mostrar detalles
            const ownerName = appointment.profiles?.first_name 
                ? `${appointment.profiles.first_name} ${appointment.profiles.last_name}`
                : appointment.profiles?.full_name || 'Cliente';
            
            const statusColors = {
                'pendiente': 'border-yellow-500 bg-yellow-50',
                'confirmada': 'border-blue-500 bg-blue-50',
                'completada': 'border-green-500 bg-green-50',
                'cancelada': 'border-gray-400 bg-gray-50',
                'rechazada': 'border-red-400 bg-red-50'
            };
            
            slot.className += ` ${statusColors[appointment.status] || 'border-gray-300'}`;
            slot.innerHTML = `
                <div class="font-bold text-sm">${time}</div>
                <div class="text-xs text-gray-700 mt-1">${appointment.pets?.name || 'Mascota'}</div>
                <div class="text-xs text-gray-600">${ownerName}</div>
                <div class="text-xs text-gray-500 mt-1">${appointment.status}</div>
            `;
            slot.style.cursor = 'default';
        } else if (blocked) {
            // Está bloqueado - Opción para desbloquear
            slot.className += ' blocked-slot border-red-500';
            slot.innerHTML = `
                <div class="font-bold text-sm">${time}</div>
                <div class="text-xs text-red-700 mt-1">🚫 Bloqueado</div>
                <div class="text-xs text-gray-600">${blocked.reason || 'Sin motivo'}</div>
                <div class="mt-2">
                    <button class="unblock-btn w-full bg-red-500 text-white text-xs font-semibold py-1 rounded hover:bg-red-600">Desbloquear</button>
                </div>
            `;
            
            slot.querySelector('.unblock-btn').addEventListener('click', async () => {
                if (confirm(`¿Desbloquear el horario ${time}?`)) {
                    const result = await unblockTimeSlot(dateStr, time + ':00');
                    if (result.success) {
                        alert('Horario desbloqueado');
                        await renderCalendar();
                        openDayDetailModal(dateStr);
                    } else {
                        alert('Error al desbloquear horario');
                    }
                }
            });
        } else {
            // Está disponible - Opciones de agendar/bloquear
            slot.className += ' border-green-300 bg-green-50 hover:bg-green-100 cursor-pointer';
            slot.innerHTML = `
                <div class="font-bold text-sm">${time}</div>
                <div class="text-xs text-green-700 mt-1">✓ Disponible</div>
                <div class="mt-2 flex gap-2 justify-center">
                    <button class="schedule-btn bg-green-600 text-white text-xs font-semibold py-1 px-2 rounded hover:bg-green-700">Agendar Cita</button>
                    <button class="block-btn bg-gray-600 text-white text-xs font-semibold py-1 px-2 rounded hover:bg-gray-700">Bloquear</button>
                </div>
            `;
            
            slot.querySelector('.schedule-btn').addEventListener('click', () => {
                // Abrir el modal de agendar cita con la fecha y hora seleccionadas
                openAddAppointmentModal(dateStr, time);
            });

            slot.querySelector('.block-btn').addEventListener('click', async () => {
                const reason = prompt(`Bloquear horario ${time}. Motivo (opcional):`, 'Bloqueado por administrador');
                if (reason !== null) {
                    const result = await blockTimeSlot(dateStr, time + ':00', reason || 'Bloqueado por administrador');
                    if (result.success) {
                        alert('Horario bloqueado');
                        await renderCalendar();
                        openDayDetailModal(dateStr);
                    } else {
                        alert('Error al bloquear horario');
                    }
                }
            });
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

// --- FUNCIÓN DE INICIALIZACIÓN DE LISTENERS (para corregir el error) ---

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

    newAppointmentDateInput?.addEventListener('change', async () => {
        const selectedDate = newAppointmentDateInput.value;
        if (!selectedDate) return;
        
        newAppointmentTimeSelect.innerHTML = '<option>Cargando...</option>';
        const bookedTimes = await getBookedTimesForDashboard(selectedDate);
        
        newAppointmentTimeSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
        AVAILABLE_HOURS.forEach(hour => {
            if (!bookedTimes.includes(hour)) {
                const option = new Option(hour, hour + ':00');
                newAppointmentTimeSelect.add(option);
            }
        });
        newAppointmentTimeSelect.disabled = false;
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
            status: 'confirmada' // Asumimos que el administrador lo confirma inmediatamente
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
                // 1. Verificar si la cita es para el futuro
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
                    } else {
                        alert('La cita fue agendada, pero no se pudo notificar por WhatsApp porque el cliente no tiene un número de teléfono registrado.');
                    }
                } else {
                    // 2. Mensaje si la fecha es pasada
                    alert('Cita agendada para una fecha/hora pasada. No se envió notificación por WhatsApp.');
                }
            } catch (e) {
                console.error('Error al intentar enviar WhatsApp:', e);
                alert('La cita fue agendada, pero ocurrió un error al intentar generar el mensaje de WhatsApp.');
            }

            closeAddAppointmentModal();
            await renderCalendar(); // Recargar el calendario para mostrar la nueva cita
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
    
    // Cargar datos de clientes y mascotas al inicio
    clientsWithPets = await getClientsWithPets();
    
    // Configurar listeners del modal de agendamiento después de que el DOM esté cargado.
    setupAppointmentModalListeners();
    
    await renderCalendar();
});