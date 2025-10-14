// public/modules/dashboard/dashboard-appointments.js (Versión de depuración)

import { supabase } from '../../core/supabase.js';
import { getAppointmentPhotos, uploadAppointmentPhoto, uploadReceiptFile, updateAppointmentStatus } from './dashboard.api.js';
import { addWeightRecord } from './pet-weight.api.js';
import { createAppointmentRow } from './dashboard.utils.js';

console.log("🚀 dashboard-appointments.js v2.1 (Depurando Búsqueda) cargado.");

let currentPage = 0;
const PAGE_SIZE = 15;
let totalAppointmentsCount = 0;
let currentAppointmentsPage = [];

// ... (El resto de tus elementos del DOM aquí, sin cambios)
const appointmentsTableBody = document.querySelector('#appointments-table-body');
const searchInput = document.querySelector('#appointment-search-input');
const statusFilter = document.querySelector('#appointment-status-filter');
const dateFilter = document.querySelector('#appointment-date-filter');
const clearFiltersButton = document.querySelector('#clear-filters-button');
const pageInfo = document.querySelector('#page-info');
const totalCount = document.querySelector('#total-count');
const prevButton = document.querySelector('#prev-button');
const nextButton = document.querySelector('#next-button');
const prevButtonMobile = document.querySelector('#prev-button-mobile');
const nextButtonMobile = document.querySelector('#next-button-mobile');
// ... (y todos los elementos del modal, sin cambios)


const getAppointmentsPage = async (page, filters = {}) => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, status, final_observations, 
            final_weight, invoice_pdf_url, pet_id, 
            pets ( name ), 
            profiles ( full_name, first_name, last_name )
        `, { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.date) query = query.eq('appointment_date', filters.date);
    
    // --- LÍNEA DE BÚSQUEDA DESACTIVADA TEMPORALMENTE ---
    // if (filters.searchTerm) {
    //     query = query.or(`pets.name.ilike.%${filters.searchTerm}%,profiles.full_name.ilike.%${filters.searchTerm}%`);
    // }

    query = query.order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) {
        console.error('Error al obtener la página de citas:', error);
        return { data: [], count: 0 };
    }
    return { data: data || [], count: count || 0 };
};

// ... (Aquí va el resto de tu archivo JS que te pasé antes, SIN NINGÚN OTRO CAMBIO)
// (Incluyendo renderAppointmentsTable, updatePaginationControls, openCompletionModal, etc.)

const renderAppointmentsTable = (appointments) => {
    if (!appointmentsTableBody) return;
    appointmentsTableBody.innerHTML = appointments.length > 0
        ? appointments.map(createAppointmentRow).join('')
        : `<tr><td colspan="5" class="text-center py-8 text-gray-500">No se encontraron citas con los filtros actuales.</td></tr>`;
};

const updatePaginationControls = () => {
    const totalPages = Math.ceil(totalAppointmentsCount / PAGE_SIZE) || 1;
    pageInfo.textContent = `${currentPage + 1} de ${totalPages}`;
    totalCount.textContent = totalAppointmentsCount;
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage >= totalPages - 1;
    prevButton.disabled = prevButtonMobile.disabled = isFirstPage;
    nextButton.disabled = nextButtonMobile.disabled = isLastPage;
};

const loadPage = async (page) => {
    appointmentsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">Cargando citas...</td></tr>`;
    const filters = { status: statusFilter.value, date: dateFilter.value, searchTerm: searchInput.value.trim() };
    const { data, count } = await getAppointmentsPage(page, filters);
    currentAppointmentsPage = data;
    totalAppointmentsCount = count;
    currentPage = page;
    renderAppointmentsTable(currentAppointmentsPage);
    updatePaginationControls();
};

const initializeEventListeners = () => {
    [searchInput, statusFilter, dateFilter].forEach(el => el.addEventListener('input', () => loadPage(0)));
    clearFiltersButton.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = '';
        dateFilter.value = '';
        loadPage(0);
    });
    [prevButton, prevButtonMobile].forEach(btn => btn.addEventListener('click', () => loadPage(currentPage - 1)));
    [nextButton, nextButtonMobile].forEach(btn => btn.addEventListener('click', () => loadPage(currentPage + 1)));
    // Aquí va el resto de tus listeners del modal, que permanecen igual.
};

document.addEventListener('DOMContentLoaded', () => {
    loadPage(0);
    initializeEventListeners();
});

// AÑADE AQUÍ EL RESTO DE TU CÓDIGO JS PARA LOS MODALES, TAL CUAL LO TENÍAS
// (openCompletionModal, loadExistingPhotosAndReceipt, etc.)