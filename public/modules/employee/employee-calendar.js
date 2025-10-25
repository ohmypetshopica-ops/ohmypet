// public/modules/employee/employee-calendar.js
// Módulo de calendario

import { state, updateState } from './employee-state.js';
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let calendarGrid, currentMonthYear, prevMonthBtn, nextMonthBtn;
let calendarModal, modalContent, modalDateTitle, modalDailyView, modalAppointmentsList;
let modalDetailsView, modalDetailsContent, modalBackBtn;

export const initCalendarElements = () => {
    calendarGrid = document.getElementById('calendar-grid');
    currentMonthYear = document.getElementById('current-month-year');
    prevMonthBtn = document.getElementById('prev-month');
    nextMonthBtn = document.getElementById('next-month');
    
    calendarModal = document.getElementById('calendar-modal');
    modalContent = document.getElementById('modal-content');
    modalDateTitle = document.getElementById('modal-date-title');
    modalDailyView = document.getElementById('modal-daily-view');
    modalAppointmentsList = document.getElementById('modal-appointments-list');
    modalDetailsView = document.getElementById('modal-details-view');
    modalDetailsContent = document.getElementById('modal-details-content');
    modalBackBtn = document.getElementById('modal-back-btn');
};

export const setupCalendarListeners = () => {
    prevMonthBtn?.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn?.addEventListener('click', () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    modalBackBtn?.addEventListener('click', () => {
        modalDailyView?.classList.remove('hidden');
        modalDetailsView?.classList.add('hidden');
    });
    
    calendarModal?.addEventListener('click', (e) => {
        if (e.target === calendarModal) closeModal();
    });
};

export const renderCalendar = async () => {
    if (!calendarGrid) return;
    
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;
    
    // Obtener citas del mes
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data: appointments } = await supabase
        .from('appointments')
        .select('*, pets(name), profiles(first_name, last_name)')
        .gte('appointment_date', firstDay)
        .lte('appointment_date', lastDay)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
    
    updateState('monthlyAppointments', appointments || []);
    
    // Calcular días del mes
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    calendarGrid.innerHTML = '';
    
    // Días de la semana
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'text-center font-bold text-gray-600 text-sm p-2';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Días del mes anterior (grises)
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayCell = createDayCell(day, true, year, month - 1, []);
        calendarGrid.appendChild(dayCell);
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        const dayAppointments = state.monthlyAppointments.filter(app => app.appointment_date === dateStr);
        const dayCell = createDayCell(day, false, year, month, dayAppointments);
        calendarGrid.appendChild(dayCell);
    }
    
    // Días del siguiente mes (grises)
    const totalCells = calendarGrid.children.length - 7; // Restar headers
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
        for (let day = 1; day <= remainingCells; day++) {
            const dayCell = createDayCell(day, true, year, month + 1, []);
            calendarGrid.appendChild(dayCell);
        }
    }
};

const createDayCell = (day, isOtherMonth, year, month, dayAppointments) => {
    const cell = document.createElement('div');
    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = dateStr === today;
    
    cell.className = `p-2 border rounded-lg text-center cursor-pointer transition-colors ${
        isOtherMonth ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-green-50'
    } ${isToday ? 'ring-2 ring-green-500' : ''}`;
    
    const dayNumber = document.createElement('div');
    dayNumber.className = `font-semibold mb-1 ${isToday ? 'text-green-600' : ''}`;
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);
    
    if (dayAppointments.length > 0 && !isOtherMonth) {
        const badge = document.createElement('div');
        badge.className = 'bg-green-500 text-white text-xs rounded-full px-2 py-0.5';
        badge.textContent = `${dayAppointments.length} cita${dayAppointments.length > 1 ? 's' : ''}`;
        cell.appendChild(badge);
        
        cell.addEventListener('click', () => openDayDetails(dateStr, dayAppointments));
    }
    
    return cell;
};

const openDayDetails = (date, appointments) => {
    updateState('selectedDate', date);
    
    const dateObj = new Date(date + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    modalDateTitle.textContent = dateObj.toLocaleDateString('es-ES', options);
    
    modalAppointmentsList.innerHTML = appointments.map(app => {
        const statusColors = {
            'pendiente': 'bg-yellow-100 text-yellow-800',
            'confirmada': 'bg-green-100 text-green-800',
            'completada': 'bg-blue-100 text-blue-800',
            'cancelada': 'bg-red-100 text-red-800'
        };
        
        return `
            <div class="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-gray-50" data-appointment-id="${app.id}">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-bold text-lg">${app.pets?.name || 'N/A'}</p>
                        <p class="text-sm text-gray-600">${app.profiles?.first_name || ''} ${app.profiles?.last_name || ''}</p>
                    </div>
                    <span class="text-sm font-semibold ${statusColors[app.status] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded">
                        ${app.status}
                    </span>
                </div>
                <p class="text-sm text-gray-700"><strong>Hora:</strong> ${app.appointment_time.slice(0, 5)}</p>
                <p class="text-sm text-gray-700"><strong>Servicio:</strong> ${app.service || 'N/A'}</p>
            </div>
        `;
    }).join('');
    
    modalAppointmentsList.querySelectorAll('[data-appointment-id]').forEach(item => {
        item.addEventListener('click', () => {
            const appointmentId = item.dataset.appointmentId;
            const appointment = appointments.find(a => a.id === appointmentId);
            if (appointment) showAppointmentDetails(appointment);
        });
    });
    
    modalDailyView?.classList.remove('hidden');
    modalDetailsView?.classList.add('hidden');
    calendarModal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const showAppointmentDetails = (appointment) => {
    modalDetailsContent.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-sm space-y-4">
            <h3 class="text-2xl font-bold text-gray-800">${appointment.pets?.name || 'N/A'}</h3>
            <div class="space-y-2">
                <p><strong>Cliente:</strong> ${appointment.profiles?.first_name || ''} ${appointment.profiles?.last_name || ''}</p>
                <p><strong>Fecha:</strong> ${appointment.appointment_date}</p>
                <p><strong>Hora:</strong> ${appointment.appointment_time.slice(0, 5)}</p>
                <p><strong>Servicio:</strong> ${appointment.service || 'N/A'}</p>
                <p><strong>Estado:</strong> ${appointment.status}</p>
                ${appointment.notes ? `<p><strong>Notas:</strong> ${appointment.notes}</p>` : ''}
                ${appointment.final_observations ? `<p><strong>Observaciones finales:</strong> ${appointment.final_observations}</p>` : ''}
            </div>
        </div>
    `;
    
    modalDailyView?.classList.add('hidden');
    modalDetailsView?.classList.remove('hidden');
};

const closeModal = () => {
    calendarModal?.classList.add('hidden');
    document.body.style.overflow = '';
    updateState('selectedDate', null);
};