// public/modules/employee/employee-calendar.js
// Módulo de calendario

import { state, updateState } from './employee-state.js';
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let calendarGrid, currentMonthYear, prevMonthBtn, nextMonthBtn;

// Vistas
let calendarListView;
let calendarDetailsView;
let backToCalendarBtn;
let detailsViewDateTitle;
let dailyAppointmentsList;


export const initCalendarElements = () => {
    calendarGrid = document.getElementById('calendar-grid');
    currentMonthYear = document.getElementById('current-month-year');
    prevMonthBtn = document.getElementById('prev-month');
    nextMonthBtn = document.getElementById('next-month');
    
    // Inicialización de Vistas y Componentes
    calendarListView = document.getElementById('calendar-list-view');
    calendarDetailsView = document.getElementById('calendar-details-view');
    backToCalendarBtn = document.getElementById('back-to-calendar-btn');
    detailsViewDateTitle = document.getElementById('details-view-date-title');
    dailyAppointmentsList = document.getElementById('daily-appointments-list');
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
    
    backToCalendarBtn?.addEventListener('click', showCalendarList);
};

// Función para cambiar a la vista de lista del calendario
const showCalendarList = () => {
    calendarListView?.classList.remove('hidden');
    calendarDetailsView?.classList.add('hidden');
    updateState('selectedDate', null);
    renderCalendar(); // Forzar renderizado para resetear el estado
};

export const renderCalendar = async () => {
    if (!calendarGrid) return;
    
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;
    
    // Obtener citas del mes
    const firstDayStr = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDayStr = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    // Obtenemos solo citas (ELIMINANDO LOGICA DE BLOCKED_SLOTS)
    const appointmentsRes = await supabase
        .from('appointments')
        .select(`id, appointment_date, appointment_time, service, status, pet_id, user_id, 
                 pets (name, image_url), profiles (first_name, last_name, full_name)`)
        .gte('appointment_date', firstDayStr)
        .lte('appointment_date', lastDayStr);
    
    
    // Guardamos todas las citas en el estado para la vista de detalle
    updateState('allAppointments', appointmentsRes.data || []);
    
    const allEvents = appointmentsRes.data || []; // Solo citas
    
    // Calcular días del mes
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Domingo, 1 = Lunes
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    calendarGrid.innerHTML = '';
    
    // Días de la semana (Encabezado) - Estilo limpio y en una sola línea
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        // Estilo fijo para encabezado
        dayHeader.className = 'p-2 text-center font-semibold text-gray-500 text-sm border-b border-r border-gray-200 bg-gray-100';
        dayHeader.textContent = day.charAt(0); // Solo la primera letra
        calendarGrid.appendChild(dayHeader);
    });
    
    // Días de relleno (Mes anterior)
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayCell = createDayCell(day, true, year, month - 1, []);
        calendarGrid.appendChild(dayCell);
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayEvents = allEvents.filter(e => {
            const eventDate = e.appointment_date;
            return eventDate === dateStr;
        });
        const dayCell = createDayCell(day, false, year, month, dayEvents);
        calendarGrid.appendChild(dayCell);
    }
    
    // Días de relleno (Mes siguiente)
    const totalCells = calendarGrid.children.length;
    const cellsNeeded = 7 - (totalCells % 7);
    const remainingCells = (cellsNeeded === 7 ? 0 : cellsNeeded);

    for (let day = 1; day <= remainingCells; day++) {
        const dayCell = createDayCell(day, true, year, month + 1, []);
        calendarGrid.appendChild(dayCell);
    }
};

const createDayCell = (day, isOtherMonth, year, month, dayEvents) => {
    const cell = document.createElement('div');
    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = dateStr === today;
    
    const hasEvents = dayEvents.length > 0;
    
    // Determinar clase de fondo: Si tiene eventos (y no es otro mes), usar verde claro.
    const eventClass = hasEvents && !isOtherMonth ? 'bg-green-100 font-bold' : 'bg-white';
    
    // Estilo de celda (limpio)
    let cellClasses = 'p-2 text-center flex flex-col items-center justify-center transition-all duration-200 rounded-lg cursor-pointer h-16';

    if (isToday && !isOtherMonth) {
        cellClasses += ' bg-green-600 text-white font-bold transform scale-105 shadow-md';
    } else if (isOtherMonth) {
        cellClasses += ' text-gray-400 cursor-default';
    } else {
        cellClasses += ` ${eventClass} text-gray-900 hover:bg-gray-200`;
    }

    cell.className = cellClasses;
    
    // Contenedor del número
    const dayNumber = document.createElement('div');
    
    const isDayBold = hasEvents && !isToday && !isOtherMonth ? 'font-bold' : 'font-normal';
    dayNumber.className = `text-lg ${isDayBold}`;
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);
    
    if (!isOtherMonth) {
        
        // Muestra el resumen (solo citas) - solo se hace el clic si hay eventos
        
        if (hasEvents) {
            cell.addEventListener('click', () => openDayDetails(dateStr));
        }
    }
    
    return cell;
};

const openDayDetails = (dateStr) => {
    updateState('selectedDate', dateStr);
    
    // 1. Mostrar la vista de detalle
    calendarListView?.classList.add('hidden');
    calendarDetailsView?.classList.remove('hidden');

    // 2. Formatear fecha para el título
    const date = new Date(dateStr + 'T12:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    const dateTitle = date.toLocaleDateString('es-ES', options);
    
    // 3. Establecer el título de la vista de detalle
    detailsViewDateTitle.textContent = dateTitle.charAt(0).toUpperCase() + dateTitle.slice(1);

    // 4. Filtrar y ordenar solo citas para el día
    const dayAppointments = state.allAppointments
        .filter(app => app.appointment_date === dateStr)
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    
    dailyAppointmentsList.innerHTML = '';
            
    // Mostrar Citas Agendadas
    if (dayAppointments.length > 0) {
        const totalAppointments = dayAppointments.length;
        
        // Título de Citas Agendadas
        dailyAppointmentsList.innerHTML += `<h4 class="font-bold text-green-600 mb-3 mt-4 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Citas Agendadas (${totalAppointments})
        </h4>`;
        
        dayAppointments.forEach(app => {
            const statusColors = {
                'pendiente': 'bg-yellow-100 text-yellow-800',
                'confirmada': 'bg-blue-100 text-blue-800',
                'completada': 'bg-green-100 text-green-800',
                'cancelada': 'bg-red-100 text-red-800',
                'rechazada': 'bg-gray-100 text-gray-800'
            };
            
            // Determinar nombre del dueño
            let ownerName = 'sin datos';
            if (app.profiles?.first_name) {
                 ownerName = app.profiles.first_name;
            } else if (app.profiles?.full_name) {
                 ownerName = app.profiles.full_name.split(' ')[0]; // Usar solo el primer nombre
            }
                
            // Placeholder con el color de la marca
            const petImage = app.pets?.image_url 
                ? app.pets.image_url 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(app.pets?.name || 'M')}&background=10B981&color=FFFFFF`;
            
            const statusText = app.status.charAt(0).toUpperCase() + app.status.slice(1);
            
            // Se mantiene el diseño plano para la tarjeta de cita (sin sombra)
            dailyAppointmentsList.innerHTML += `
                <div class="bg-white p-4 rounded-lg border hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3">
                    <img src="${petImage}" alt="${app.pets?.name}" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-lg text-gray-800">${app.pets?.name || 'N/A'} <span class="text-sm text-gray-500">(${ownerName})</span></p>
                        <p class="text-sm text-gray-600">${app.service || 'Sin servicio especificado'}</p>
                    </div>
                    <div class="text-right flex flex-col items-end flex-shrink-0">
                        <p class="font-bold text-xl text-gray-900">${app.appointment_time.slice(0, 5)}</p>
                        <span class="text-xs font-semibold ${statusColors[app.status] || 'bg-gray-100 text-gray-800'} px-2 py-0.5 rounded mt-1">
                            ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
    } else {
        dailyAppointmentsList.innerHTML = `<p class="text-center text-gray-500 py-8">¡Día libre! No hay citas agendadas.</p>`;
    }
};