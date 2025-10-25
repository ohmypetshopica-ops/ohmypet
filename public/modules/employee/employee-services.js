// public/modules/employee/employee-services.js
// Módulo para mostrar servicios completados

import { state, updateState } from './employee-state.js';
import { supabase } from '../../core/supabase.js';

// Elementos del DOM
let serviceSearch, completedServicesList;

export function initServiceElements() {
    serviceSearch = document.getElementById('service-search');
    completedServicesList = document.getElementById('completed-services-list');
}

export function setupServiceListeners() {
    if (serviceSearch) {
        serviceSearch.addEventListener('input', handleServiceSearch);
    }
}

// Función para obtener servicios completados (similar a la del dashboard admin)
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

// Función para renderizar la lista de servicios
export const renderCompletedServices = (services) => {
    if (!completedServicesList) return;

    if (services.length === 0) {
        completedServicesList.innerHTML = `<p class="text-center text-gray-500 mt-8">No se encontraron servicios completados.</p>`;
        return;
    }

    completedServicesList.innerHTML = services.map(service => {
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
};

// Función de búsqueda
const handleServiceSearch = (e) => {
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