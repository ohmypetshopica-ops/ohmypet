// public/modules/dashboard/dashboard-appointments.js

import { supabase } from '../../core/supabase.js';
import { getAppointments, updateAppointmentStatus } from './dashboard.api.js';
import { createAppointmentRow } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const appointmentsTableBody = document.querySelector('#appointments-table-body');
const searchInput = document.querySelector('#appointment-search-input');
const statusFilter = document.querySelector('#appointment-status-filter');
const dateFilter = document.querySelector('#appointment-date-filter');
const clearFiltersButton = document.querySelector('#clear-filters-button');
const headerTitle = document.querySelector('#header-title');

// --- ESTADO ---
let allAppointments = []; // Caché local para evitar llamadas repetidas a la DB

// --- RENDERIZADO Y FILTRADO ---
const renderAppointmentsTable = (appointments) => {
    if (!appointmentsTableBody) return;
    if (appointments.length > 0) {
        appointmentsTableBody.innerHTML = appointments.map(createAppointmentRow).join('');
    } else {
        appointmentsTableBody.innerHTML = `<tr><td colspan="5" class="block md:table-cell text-center py-8 text-gray-500">No se encontraron citas con los filtros actuales.</td></tr>`;
    }
};

const applyFiltersAndSearch = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;
    const selectedDate = dateFilter.value;

    let filteredAppointments = allAppointments;

    if (selectedStatus) {
        filteredAppointments = filteredAppointments.filter(app => app.status === selectedStatus);
    }

    if (selectedDate) {
        filteredAppointments = filteredAppointments.filter(app => app.appointment_date === selectedDate);
    }

    if (searchTerm) {
        filteredAppointments = filteredAppointments.filter(app => {
            const ownerName = (app.profiles?.full_name || `${app.profiles?.first_name} ${app.profiles?.last_name}`).toLowerCase();
            const petName = app.pets?.name.toLowerCase();
            return ownerName.includes(searchTerm) || petName.includes(searchTerm);
        });
    }

    renderAppointmentsTable(filteredAppointments);
};

// --- MANEJO DE ACCIONES ---
const setupActionHandlers = () => {
    if (!appointmentsTableBody) return;

    appointmentsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const appointmentId = button.closest('tr').dataset.appointmentId;
        const newStatusMap = {
            'confirmar': 'confirmada',
            'rechazar': 'rechazada',
            'completar': 'completada'
        };
        const newStatus = newStatusMap[action];
        if (!newStatus) return;

        button.disabled = true;
        button.textContent = '...';

        const { success, error } = await updateAppointmentStatus(appointmentId, newStatus);

        if (success) {
            const updatedAppointmentIndex = allAppointments.findIndex(app => app.id == appointmentId);
            if (updatedAppointmentIndex !== -1) {
                allAppointments[updatedAppointmentIndex].status = newStatus;
                applyFiltersAndSearch();
            }
        } else {
            alert(`Error al actualizar la cita: ${error.message}`);
            button.disabled = false;
            button.textContent = action.charAt(0).toUpperCase() + action.slice(1);
        }
    });
};

// --- INICIALIZACIÓN ---
const initializeAppointmentsSection = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Gestión de Citas';
    }

    allAppointments = await getAppointments();
    renderAppointmentsTable(allAppointments);

    searchInput.addEventListener('input', applyFiltersAndSearch);
    statusFilter.addEventListener('change', applyFiltersAndSearch);
    dateFilter.addEventListener('change', applyFiltersAndSearch);
    clearFiltersButton.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = '';
        dateFilter.value = '';
        applyFiltersAndSearch();
    });

    setupActionHandlers();
};

document.addEventListener('DOMContentLoaded', initializeAppointmentsSection);