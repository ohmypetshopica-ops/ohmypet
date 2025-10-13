// public/modules/dashboard/dashboard-calendar.js

import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const todayBtn = document.getElementById('today-btn');
const headerTitle = document.querySelector('#header-title');

// Modal
const dayDetailModal = document.getElementById('day-detail-modal');
const modalDate = document.getElementById('modal-date');
const timeSlotsContainer = document.getElementById('time-slots-container');
const closeModalBtn = document.getElementById('close-modal');

// --- ESTADO ---
let currentDate = new Date();
let appointments = [];
let blockedSlots = [];
let selectedDate = null;

// --- HORARIOS DISPONIBLES ---
const AVAILABLE_HOURS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00"
];

// --- FUNCIONES DE API ---

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
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
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
        slot.className = 'p-3 rounded-lg border-2 transition-all cursor-pointer';
        
        if (appointment) {
            // Hay una cita
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
            // Está bloqueado
            slot.className += ' blocked-slot border-red-500';
            slot.innerHTML = `
                <div class="font-bold text-sm">${time}</div>
                <div class="text-xs text-red-700 mt-1">🚫 Bloqueado</div>
                <div class="text-xs text-gray-600">${blocked.reason || 'Sin motivo'}</div>
            `;
            
            slot.addEventListener('click', async () => {
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
            // Está disponible
            slot.className += ' border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-500';
            slot.innerHTML = `
                <div class="font-bold text-sm">${time}</div>
                <div class="text-xs text-green-700 mt-1">✓ Disponible</div>
                <div class="text-xs text-gray-600">Click para bloquear</div>
            `;
            
            slot.addEventListener('click', async () => {
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
 * Cierra el modal
 */
const closeDayDetailModal = () => {
    dayDetailModal.classList.add('hidden');
};

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
    
    await renderCalendar();
});