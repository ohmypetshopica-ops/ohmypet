// public/modules/employee/employee-services.js
// Módulo para mostrar servicios completados

import { state, updateState } from './employee-state.js';
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let serviceSearch, completedServicesList;
let paginationContainerServices; // ====== ELEMENTO AGREGADO ======

// ====== VARIABLES AGREGADAS PARA PAGINACIÓN ======
let currentPageServices = 1;
const itemsPerPageServices = 10; // Puedes ajustar este número
// ====== FIN VARIABLES AGREGADAS ======

export function initServiceElements() {
    serviceSearch = document.getElementById('service-search');
    completedServicesList = document.getElementById('completed-services-list');
    paginationContainerServices = document.getElementById('pagination-container-services'); // ====== INICIALIZACIÓN AGREGADA ======
}

export function setupServiceListeners() {
    if (serviceSearch) {
        serviceSearch.addEventListener('input', handleServiceSearch);
    }
}

// Función para obtener servicios completados (sin cambios)
const getCompletedServices = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, service_price, payment_method,
            final_observations, final_weight, pet_id,
            pets (id, name, image_url),
            profiles (id, full_name, first_name, last_name)
        `)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

    if (error) {
        console.error('Error al obtener servicios completados:', error);
        return [];
    }
    return data || [];
};

// ====== FUNCIÓN DE RENDERIZADO DE PAGINACIÓN AGREGADA ======
const renderPaginationServices = (totalItems) => {
    if (!paginationContainerServices) return;

    const totalPages = Math.ceil(totalItems / itemsPerPageServices);
    if (totalPages <= 1) {
        paginationContainerServices.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center space-x-2">';

    paginationHTML += `
        <button data-page="${currentPageServices - 1}" class="px-3 py-1 border rounded-lg ${currentPageServices === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}" ${currentPageServices === 1 ? 'disabled' : ''}>
            Anterior
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPageServices ? 'bg-green-600 text-white' : 'bg-white hover:bg-gray-50';
        paginationHTML += `<button data-page="${i}" class="px-3 py-1 border rounded-lg ${activeClass}">${i}</button>`;
    }

    paginationHTML += `
        <button data-page="${currentPageServices + 1}" class="px-3 py-1 border rounded-lg ${currentPageServices === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}" ${currentPageServices === totalPages ? 'disabled' : ''}>
            Siguiente
        </button>
    `;

    paginationHTML += '</div>';
    paginationContainerServices.innerHTML = paginationHTML;

    paginationContainerServices.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            currentPageServices = parseInt(button.dataset.page);
            const searchTerm = serviceSearch.value.toLowerCase();
            const filtered = searchTerm ? state.completedServices.filter(service => {
                const ownerName = (service.profiles?.first_name ? `${service.profiles.first_name} ${service.profiles.last_name || ''}` : service.profiles?.full_name || '').toLowerCase();
                const petName = (service.pets?.name || '').toLowerCase();
                return petName.includes(searchTerm) || ownerName.includes(searchTerm);
            }) : state.completedServices;
            renderCompletedServices(filtered);
        });
    });
};


// ====== FUNCIÓN `renderCompletedServices` MODIFICADA ======
export const renderCompletedServices = (services) => {
    if (!completedServicesList) return;

    // Lógica de paginación
    const startIndex = (currentPageServices - 1) * itemsPerPageServices;
    const endIndex = startIndex + itemsPerPageServices;
    const paginatedServices = services.slice(startIndex, endIndex);


    if (paginatedServices.length === 0) {
        completedServicesList.innerHTML = `<p class="text-center text-gray-500 mt-8">No se encontraron servicios completados.</p>`;
        renderPaginationServices(0); // Limpiar paginación si no hay resultados
        return;
    }

    completedServicesList.innerHTML = paginatedServices.map(service => {
        const ownerName = service.profiles?.first_name ? `${service.profiles.first_name} ${service.profiles.last_name || ''}` : service.profiles?.full_name || 'Cliente';
        const petName = service.pets?.name || 'Mascota';
        const petImage = service.pets?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(petName)}&background=10B981&color=FFFFFF`;
        const serviceDate = new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        const servicePrice = service.service_price ? `S/ ${service.service_price.toFixed(2)}` : 'N/A';
        const paymentMethod = service.payment_method || 'N/A';

        return `
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-start space-x-3">
                <img src="${petImage}" alt="${petName}" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <p class="font-bold text-gray-800 truncate">${petName} <span class="text-sm text-gray-500 font-normal">(${ownerName})</span></p>
                        <span class="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded">${serviceDate}</span>
                    </div>
                    <p class="text-sm text-gray-600">${service.service || 'Servicio General'}</p>
                    <div class="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3">
                        <span>Precio: ${servicePrice}</span>
                        <span>Pago: ${paymentMethod}</span>
                        ${service.final_weight ? `<span>Peso: ${service.final_weight} kg</span>` : ''}
                    </div>
                     ${service.final_observations ? `<p class="text-xs text-gray-500 mt-1 truncate">Obs: ${service.final_observations}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Renderizar la paginación
    renderPaginationServices(services.length);
};

// Función de búsqueda
const handleServiceSearch = (e) => {
    currentPageServices = 1; // ====== LÍNEA AGREGADA ======
    const term = e.target.value.toLowerCase();
    const filtered = term ? state.completedServices.filter(service => {
        const ownerName = service.profiles?.first_name ? `${service.profiles.first_name} ${service.profiles.last_name || ''}`.toLowerCase() : (service.profiles?.full_name || '').toLowerCase();
        const petName = (service.pets?.name || '').toLowerCase();
        return petName.includes(term) || ownerName.includes(term);
    }) : state.completedServices;
    renderCompletedServices(filtered);
};

// Cargar datos iniciales (se llamará desde dashboard.js)
export const loadCompletedServicesData = async () => {
    const services = await getCompletedServices();
    updateState('completedServices', services);
    renderCompletedServices(services);
};