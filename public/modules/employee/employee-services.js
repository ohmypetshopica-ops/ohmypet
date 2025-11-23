// public/modules/employee/employee-services.js
// Módulo para mostrar y editar servicios completados

import { state, updateState } from './employee-state.js';
import { supabase } from '../../core/supabase.js';
import { uploadAppointmentPhoto } from '../dashboard/dashboard.api.js'; // Importante para subir fotos

// Elementos del DOM
let serviceSearch, completedServicesList;
let paginationContainerServices;

// Elementos de vistas
let servicesListView, serviceDetailsView, serviceReadMode, serviceEditMode;
let serviceDetailsContent, backToServicesBtn;

// Elementos de Edición
let btnEnableEdit, btnCancelEdit, btnSaveEdit, formEditService;
let inputEditId, inputEditPrice, inputEditWeight, selectEditPayment, inputEditObservations;
let inputEditArrival, inputEditDeparture, previewEditArrival, previewEditDeparture;
let editServiceMessage;

// Variables de estado local
let currentPageServices = 1;
const itemsPerPageServices = 10;
let currentServiceEditing = null;

export function initServiceElements() {
    // Lista
    serviceSearch = document.getElementById('service-search');
    completedServicesList = document.getElementById('completed-services-list');
    paginationContainerServices = document.getElementById('pagination-container-services');
    
    // Vistas contenedoras
    servicesListView = document.getElementById('services-list-view');
    serviceDetailsView = document.getElementById('service-details-view');
    
    // Modos
    serviceReadMode = document.getElementById('service-read-mode');
    serviceEditMode = document.getElementById('service-edit-mode');
    
    // Contenido lectura
    serviceDetailsContent = document.getElementById('service-details-content');
    backToServicesBtn = document.getElementById('back-to-services-btn');
    btnEnableEdit = document.getElementById('btn-enable-edit');

    // Formulario Edición
    btnCancelEdit = document.getElementById('btn-cancel-edit');
    btnSaveEdit = document.getElementById('btn-save-edit');
    formEditService = document.getElementById('form-edit-service');
    
    inputEditId = document.getElementById('edit-service-id');
    inputEditPrice = document.getElementById('input-edit-price');
    inputEditWeight = document.getElementById('input-edit-weight');
    selectEditPayment = document.getElementById('select-edit-payment');
    inputEditObservations = document.getElementById('input-edit-observations');
    
    inputEditArrival = document.getElementById('input-edit-arrival');
    inputEditDeparture = document.getElementById('input-edit-departure');
    previewEditArrival = document.getElementById('preview-edit-arrival');
    previewEditDeparture = document.getElementById('preview-edit-departure');
    
    editServiceMessage = document.getElementById('edit-service-message');
}

export function setupServiceListeners() {
    if (serviceSearch) {
        serviceSearch.addEventListener('input', handleServiceSearch);
    }
    
    // Navegación básica
    backToServicesBtn?.addEventListener('click', showServicesList);

    // Entrar en modo edición
    btnEnableEdit?.addEventListener('click', () => {
        if (currentServiceEditing) {
            populateEditForm(currentServiceEditing);
            toggleEditMode(true);
        }
    });

    // Cancelar edición
    btnCancelEdit?.addEventListener('click', () => {
        toggleEditMode(false);
    });

    // Guardar cambios
    formEditService?.addEventListener('submit', handleSaveServiceChanges);

    // Previsualización de imágenes en el form
    inputEditArrival?.addEventListener('change', (e) => handleImagePreview(e, previewEditArrival));
    inputEditDeparture?.addEventListener('change', (e) => handleImagePreview(e, previewEditDeparture));

    // Delegación de eventos para ver detalles desde la lista
    completedServicesList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-service-details-btn');
        if (btn) {
            const serviceId = btn.dataset.id;
            showServiceDetails(serviceId);
        }
    });
}

// --- GESTIÓN DE VISTAS ---

const showServicesList = () => {
    serviceDetailsView?.classList.add('hidden');
    servicesListView?.classList.remove('hidden');
    toggleEditMode(false); // Asegurar que el modo edición esté cerrado
    document.querySelector('.content-area')?.scrollTo(0, 0);
};

const toggleEditMode = (showEdit) => {
    if (showEdit) {
        serviceReadMode.classList.add('hidden');
        serviceEditMode.classList.remove('hidden');
        editServiceMessage.classList.add('hidden');
    } else {
        serviceReadMode.classList.remove('hidden');
        serviceEditMode.classList.add('hidden');
    }
    document.querySelector('.content-area')?.scrollTo(0, 0);
};

// --- DETALLES Y POBLADO DE DATOS ---

const showServiceDetails = async (serviceId) => {
    const service = state.completedServices.find(s => s.id == serviceId);
    if (!service) return;

    currentServiceEditing = service; // Guardar referencia para edición

    const photos = service.appointment_photos || [];
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
    const departurePhoto = photos.find(p => p.photo_type === 'departure');

    const arrivalImgHTML = arrivalPhoto 
        ? `<img src="${arrivalPhoto.image_url}" class="w-full h-48 object-cover rounded-lg border border-gray-200" alt="Llegada">`
        : `<div class="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">Sin foto de llegada</div>`;

    const departureImgHTML = departurePhoto 
        ? `<img src="${departurePhoto.image_url}" class="w-full h-48 object-cover rounded-lg border border-gray-200" alt="Salida">`
        : `<div class="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">Sin foto de salida</div>`;

    const ownerName = service.profiles?.first_name 
        ? `${service.profiles.first_name} ${service.profiles.last_name || ''}` 
        : service.profiles?.full_name || 'Cliente';
    
    const petName = service.pets?.name || 'Mascota';
    const petImage = service.pets?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(petName)}&background=10B981&color=FFFFFF`;

    const serviceDate = new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Renderizar contenido detallado (Modo Lectura)
    serviceDetailsContent.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-4 border-b border-gray-100 bg-green-50">
                <div class="flex items-center gap-3">
                    <img src="${petImage}" alt="${petName}" class="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">${petName}</h2>
                        <p class="text-sm text-gray-600">Dueño: ${ownerName}</p>
                    </div>
                </div>
            </div>

            <div class="p-4 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-xs text-gray-500 uppercase font-semibold">Fecha</p>
                        <p class="text-sm font-medium text-gray-900">${serviceDate}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase font-semibold">Hora</p>
                        <p class="text-sm font-medium text-gray-900">${service.appointment_time.slice(0, 5)}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase font-semibold">Servicio</p>
                        <p class="text-sm font-medium text-gray-900">${service.service || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase font-semibold">Shampoo</p>
                        <p class="text-sm font-medium text-gray-900">${service.shampoo_type || 'General'}</p>
                    </div>
                </div>

                <div class="border-t border-gray-100 pt-4">
                    <h3 class="font-bold text-gray-800 mb-3">Fotos del Servicio</h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <p class="text-xs text-center text-gray-500 mb-1">Antes</p>
                            ${arrivalImgHTML}
                        </div>
                        <div>
                            <p class="text-xs text-center text-gray-500 mb-1">Después</p>
                            ${departureImgHTML}
                        </div>
                    </div>
                </div>

                <div class="border-t border-gray-100 pt-4">
                    <h3 class="font-bold text-gray-800 mb-2">Observaciones Finales</h3>
                    <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-gray-700 italic whitespace-pre-wrap">
                        ${service.final_observations || 'Sin observaciones registradas.'}
                    </div>
                </div>

                <div class="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-xs text-gray-500">Peso Final</p>
                        <p class="text-lg font-bold text-gray-800">${service.final_weight ? service.final_weight + ' kg' : 'N/A'}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-xs text-gray-500">Pago Total</p>
                        <p class="text-lg font-bold text-green-600">S/ ${service.service_price ? service.service_price.toFixed(2) : '0.00'}</p>
                        <p class="text-xs text-gray-400">${(service.payment_method || 'N/A').toUpperCase()}</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Cambiar vista
    servicesListView.classList.add('hidden');
    serviceDetailsView.classList.remove('hidden');
    toggleEditMode(false);
    document.querySelector('.content-area')?.scrollTo(0, 0);
};

const populateEditForm = (service) => {
    inputEditId.value = service.id;
    inputEditPrice.value = service.service_price || '';
    inputEditWeight.value = service.final_weight || '';
    
    // Asegurar mayúsculas para coincidir con el select
    const paymentMethod = (service.payment_method || '').toUpperCase();
    selectEditPayment.value = paymentMethod || 'DESCONOCIDO';
    if (!selectEditPayment.value) selectEditPayment.value = 'DESCONOCIDO';

    inputEditObservations.value = service.final_observations || '';

    // Resetear inputs de archivos y previews
    inputEditArrival.value = '';
    inputEditDeparture.value = '';
    
    const photos = service.appointment_photos || [];
    const arrival = photos.find(p => p.photo_type === 'arrival');
    const departure = photos.find(p => p.photo_type === 'departure');

    previewEditArrival.innerHTML = arrival 
        ? `<img src="${arrival.image_url}" class="w-full h-full object-cover">` 
        : '<span class="text-gray-400 text-xs">Sin foto actual</span>';
        
    previewEditDeparture.innerHTML = departure 
        ? `<img src="${departure.image_url}" class="w-full h-full object-cover">` 
        : '<span class="text-gray-400 text-xs">Sin foto actual</span>';
};

// --- LÓGICA DE GUARDADO Y ACTUALIZACIÓN ---

const handleImagePreview = (e, container) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            container.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover">`;
        };
        reader.readAsDataURL(file);
    }
};

const handleSaveServiceChanges = async (e) => {
    e.preventDefault();
    
    const serviceId = inputEditId.value;
    if (!serviceId) return;

    btnSaveEdit.disabled = true;
    btnSaveEdit.textContent = 'Guardando...';
    editServiceMessage.classList.add('hidden');

    try {
        // 1. Subir nuevas fotos si existen
        if (inputEditArrival.files[0]) {
            await uploadAppointmentPhoto(serviceId, inputEditArrival.files[0], 'arrival');
        }
        if (inputEditDeparture.files[0]) {
            await uploadAppointmentPhoto(serviceId, inputEditDeparture.files[0], 'departure');
        }

        // 2. Preparar datos para actualizar en appointments
        const updateData = {
            service_price: parseFloat(inputEditPrice.value) || 0,
            final_weight: parseFloat(inputEditWeight.value) || null,
            payment_method: selectEditPayment.value,
            final_observations: inputEditObservations.value.trim() || null
        };

        // 3. Actualizar base de datos
        const { error } = await supabase
            .from('appointments')
            .update(updateData)
            .eq('id', serviceId);

        if (error) throw error;

        // 4. Si hubo cambio de peso, actualizar historial de peso (opcional, pero recomendado)
        // Nota: Esto crearía un nuevo registro de peso o actualizaría el existente si tuviéramos el ID.
        // Por simplicidad, aquí solo actualizamos la cita. Si quisieras actualizar el historial de peso,
        // necesitarías buscar el registro en `pet_weight_history` asociado a este `appointment_id`.

        // 5. Recargar datos
        await loadCompletedServicesData();
        
        // 6. Actualizar vista de detalles
        editServiceMessage.textContent = '✅ Cambios guardados correctamente';
        editServiceMessage.className = 'p-3 rounded-lg text-sm font-medium text-center bg-green-100 text-green-700 mb-4';
        editServiceMessage.classList.remove('hidden');

        setTimeout(() => {
            showServiceDetails(serviceId); // Volver a cargar detalles actualizados
            btnSaveEdit.disabled = false;
            btnSaveEdit.textContent = 'Guardar Cambios';
        }, 1000);

    } catch (error) {
        console.error('Error al actualizar servicio:', error);
        editServiceMessage.textContent = `❌ Error: ${error.message}`;
        editServiceMessage.className = 'p-3 rounded-lg text-sm font-medium text-center bg-red-100 text-red-700 mb-4';
        editServiceMessage.classList.remove('hidden');
        btnSaveEdit.disabled = false;
        btnSaveEdit.textContent = 'Guardar Cambios';
    }
};

// --- CARGA DE DATOS ---

export const loadCompletedServicesData = async () => {
    const services = await getCompletedServices();
    updateState('completedServices', services);
    renderCompletedServices(services);
};

const getCompletedServices = async () => {
    // Obtenemos fotos también para tener todo listo
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, service_price, payment_method,
            final_observations, final_weight, pet_id, shampoo_type,
            pets (id, name, image_url),
            profiles (id, full_name, first_name, last_name),
            appointment_photos (photo_type, image_url)
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

// --- RENDERIZADO DE LISTA Y PAGINACIÓN ---

const handleServiceSearch = (e) => {
    currentPageServices = 1;
    const term = e.target.value.toLowerCase();

    const filtered = term ? state.completedServices.filter(service => {
        const ownerName = (service.profiles?.first_name ? `${service.profiles.first_name} ${service.profiles.last_name || ''}` : service.profiles?.full_name || '').toLowerCase();
        const petName = (service.pets?.name || '').toLowerCase();
        return petName.includes(term) || ownerName.includes(term);
    }) : state.completedServices;

    renderCompletedServices(filtered);
};

const renderPaginationServices = (totalItems) => {
    if (!paginationContainerServices) return;

    const totalPages = Math.ceil(totalItems / itemsPerPageServices);
    if (totalPages <= 1) {
        paginationContainerServices.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2">';

    const prevDisabled = currentPageServices === 1;
    paginationHTML += `
        <button data-page="${currentPageServices - 1}" 
                class="px-3 py-2 border rounded-lg transition-colors ${prevDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}" 
                ${prevDisabled ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
        </button>
    `;

    let startPage = Math.max(1, currentPageServices - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPageServices 
            ? 'bg-green-600 text-white' 
            : 'bg-white hover:bg-gray-50 text-gray-700';
        paginationHTML += `
            <button data-page="${i}" 
                    class="w-10 h-10 border rounded-lg font-medium transition-colors ${activeClass}">
                ${i}
            </button>
        `;
    }

    const nextDisabled = currentPageServices === totalPages;
    paginationHTML += `
        <button data-page="${currentPageServices + 1}" 
                class="px-3 py-2 border rounded-lg transition-colors ${nextDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}" 
                ${nextDisabled ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        </button>
    `;

    paginationHTML += '</div>';
    paginationContainerServices.innerHTML = paginationHTML;

    paginationContainerServices.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const newPage = parseInt(button.dataset.page);
            if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                currentPageServices = newPage;
                const searchTerm = serviceSearch.value.toLowerCase();
                const filtered = searchTerm ? state.completedServices.filter(service => {
                    const ownerName = (service.profiles?.first_name ? `${service.profiles.first_name} ${service.profiles.last_name || ''}` : service.profiles?.full_name || '').toLowerCase();
                    const petName = (service.pets?.name || '').toLowerCase();
                    return petName.includes(searchTerm) || ownerName.includes(searchTerm);
                }) : state.completedServices;
                renderCompletedServices(filtered);
            }
        });
    });
};

export const renderCompletedServices = (services) => {
    if (!completedServicesList) return;

    const startIndex = (currentPageServices - 1) * itemsPerPageServices;
    const endIndex = startIndex + itemsPerPageServices;
    const paginatedServices = services.slice(startIndex, endIndex);

    if (paginatedServices.length === 0) {
        completedServicesList.innerHTML = `<p class="text-center text-gray-500 mt-8">No se encontraron servicios completados.</p>`;
        renderPaginationServices(0);
        return;
    }

    completedServicesList.innerHTML = paginatedServices.map(service => {
        const ownerName = service.profiles?.first_name ? `${service.profiles.first_name} ${service.profiles.last_name || ''}` : service.profiles?.full_name || 'Cliente';
        const petName = service.pets?.name || 'Mascota';
        const petImage = service.pets?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(petName)}&background=10B981&color=FFFFFF`;
        const serviceDate = new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        const servicePrice = service.service_price ? `S/ ${service.service_price.toFixed(2)}` : 'N/A';

        return `
            <div class="bg-white p-4 rounded-lg border hover:bg-gray-50 transition-colors shadow-sm">
                <div class="flex items-center space-x-3 mb-3">
                    <img src="${petImage}" alt="${petName}" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-lg text-gray-800">${petName} <span class="text-sm text-gray-500 font-normal">(${ownerName})</span></p>
                        <p class="text-sm text-gray-600">${service.service || 'Servicio general'}</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="font-bold text-green-600">${servicePrice}</p>
                        <p class="text-xs text-gray-500">${serviceDate}</p>
                    </div>
                </div>
                
                <div class="flex justify-between items-center border-t pt-3 mt-2">
                    <span class="text-xs text-gray-500 truncate max-w-[60%]">
                        ${service.final_observations || 'Sin observaciones'}
                    </span>
                    <button class="text-blue-600 hover:text-blue-800 text-sm font-semibold view-service-details-btn" data-id="${service.id}">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
    }).join('');

    renderPaginationServices(services.length);
};