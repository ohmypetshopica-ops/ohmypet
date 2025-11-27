// public/modules/dashboard/dashboard-services.js

import { supabase } from '../../core/supabase.js';
import { uploadAppointmentPhoto, uploadReceiptFile } from './dashboard.api.js';

// --- ELEMENTOS DEL DOM ---
const servicesTableBody = document.querySelector('#services-table-body');
const serviceSearchInput = document.querySelector('#service-search-input');
const serviceDateFilter = document.querySelector('#service-date-filter');
const clearFiltersBtn = document.querySelector('#clear-filters-btn');
const totalServicesCount = document.querySelector('#total-services-count');
const completedServicesCount = document.querySelector('#completed-services-count');
const monthServicesCount = document.querySelector('#month-services-count');
const paginationContainer = document.querySelector('#pagination-container');
const headerTitle = document.querySelector('#header-title');

// --- ELEMENTOS DEL MODAL ---
const serviceDetailsModal = document.querySelector('#service-details-modal');
const modalServiceDetailsView = document.querySelector('#modal-service-details-view');
const modalServiceEditForm = document.querySelector('#modal-service-edit-form');
const closeServiceModal = document.querySelector('#close-service-modal');
const editServiceBtn = document.querySelector('#edit-service-btn');
const saveServiceBtn = document.querySelector('#save-service-btn');
const cancelEditBtn = document.querySelector('#cancel-edit-btn');

// --- ELEMENTOS DE EDICIÓN ---
const editServicePriceInput = document.querySelector('#edit-service-price');
const editPaymentMethodSelect = document.querySelector('#edit-payment-method');
const editFinalWeightInput = document.querySelector('#edit-final-weight');
const editFinalObservationsTextarea = document.querySelector('#edit-final-observations');
const editMessage = document.querySelector('#edit-message');

// Fotos
const editArrivalPhotoInput = document.querySelector('#edit-arrival-photo-input');
const editArrivalPhotoPreview = document.querySelector('#edit-arrival-photo-preview');
const editArrivalPhotoBtn = document.querySelector('#edit-arrival-photo-btn');
const removeArrivalPhotoBtn = document.querySelector('#remove-arrival-photo-btn');

const editDeparturePhotoInput = document.querySelector('#edit-departure-photo-input');
const editDeparturePhotoPreview = document.querySelector('#edit-departure-photo-preview');
const editDeparturePhotoBtn = document.querySelector('#edit-departure-photo-btn');
const removeDeparturePhotoBtn = document.querySelector('#remove-departure-photo-btn');

// Boleta
const editReceiptInput = document.querySelector('#edit-receipt-input');
const editReceiptPreview = document.querySelector('#edit-receipt-preview');
const editReceiptBtn = document.querySelector('#edit-receipt-btn');
const removeReceiptBtn = document.querySelector('#remove-receipt-btn');

// --- VARIABLES DE ESTADO ---
let currentPage = 1;
const itemsPerPage = 10;
let totalServices = 0;
let currentFilters = { search: '', date: '', petId: '', petName: '' };
let allCompletedServices = [];
let selectedService = null;
let newArrivalFile = null;
let newDepartureFile = null;
let newReceiptFile = null;
let deleteArrivalPhoto = false;
let deleteDeparturePhoto = false;
let deleteReceipt = false;

const urlParams = new URLSearchParams(window.location.search);
const petIdFromUrl = urlParams.get('pet');
const petNameFromUrl = urlParams.get('name');

// --- FUNCIONES DE API ---
const getCompletedServices = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, service_price, payment_method,
            final_observations, final_weight, pet_id, invoice_pdf_url, shampoo_type,
            pets (id, name),
            profiles (id, full_name, first_name, last_name),
            appointment_photos (id, photo_type, image_url)
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

const getServicesStats = async () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [totalRes, completedRes, monthRes] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'completada'),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
            .eq('status', 'completada')
            .gte('appointment_date', firstDayOfMonth)
            .lte('appointment_date', lastDayOfMonth)
    ]);

    return {
        total: totalRes.count || 0,
        completed: completedRes.count || 0,
        month: monthRes.count || 0
    };
};

// --- RENDERIZADO DE TABLA ---
const createServiceRow = (service) => {
    const ownerProfile = service.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin cliente';

    const petName = service.pets?.name || 'Sin mascota';
    
    // **** INICIO DE LA CORRECCIÓN 1 ****
    // Forzar mayúsculas en la visualización para consistencia
    const paymentMethod = (service.payment_method || 'N/A').toUpperCase();
    // **** FIN DE LA CORRECCIÓN 1 ****
    
    const cost = service.service_price ? `S/ ${service.service_price.toFixed(2)}` : 'N/A';

    return `
        <tr class="hover:bg-gray-50 transition-colors" data-service-id="${service.id}">
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">${ownerName}</div>
                <div class="text-sm text-gray-500">${petName}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                <div class="text-sm text-gray-500">${service.appointment_time}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700">${service.service || 'Servicio general'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700">${paymentMethod}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm font-semibold text-gray-900">${cost}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <button class="text-blue-600 hover:text-blue-900 font-semibold view-service-btn">
                    Ver Detalles
                </button>
            </td>
        </tr>
    `;
};

const renderServicesTable = (services) => {
    if (!servicesTableBody) return;
    
    if (services.length > 0) {
        servicesTableBody.innerHTML = services.map(createServiceRow).join('');
        attachServiceRowListeners();
    } else {
        servicesTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No se encontraron servicios completados.</td></tr>';
    }
};

// --- PAGINACIÓN ---
const renderPagination = (filteredServices) => {
    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
    totalServices = filteredServices.length;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4 mb-4">';

    if (currentPage > 1) {
        paginationHTML += `<button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage - 1}">Anterior</button>`;
    }

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage 
            ? 'bg-green-600 text-white' 
            : 'border border-gray-300 hover:bg-gray-100';
        paginationHTML += `<button class="px-3 py-1.5 text-sm rounded-lg transition-colors ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" data-page="${currentPage + 1}">Siguiente</button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            applyFiltersAndRender();
        });
    });
};

// --- FILTROS ---
const applyFiltersAndRender = () => {
    const searchTerm = serviceSearchInput?.value.toLowerCase().trim() || '';
    const selectedDate = serviceDateFilter?.value || '';

    let filtered = [...allCompletedServices];

    if (currentFilters.petId) {
        filtered = filtered.filter(service => service.pets?.id === currentFilters.petId);
    }

    if (searchTerm) {
        filtered = filtered.filter(service => {
            const petName = service.pets?.name?.toLowerCase() || '';
            const ownerProfile = service.profiles;
            const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name)
                ? `${ownerProfile.first_name} ${ownerProfile.last_name}`.toLowerCase()
                : ownerProfile?.full_name?.toLowerCase() || '';
            return petName.includes(searchTerm) || ownerName.includes(searchTerm);
        });
    }

    if (selectedDate) {
        filtered = filtered.filter(service => service.appointment_date === selectedDate);
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedServices = filtered.slice(startIndex, endIndex);

    renderServicesTable(paginatedServices);
    renderPagination(filtered);
};

const clearFilters = () => {
    if (serviceSearchInput) serviceSearchInput.value = '';
    if (serviceDateFilter) serviceDateFilter.value = '';
    currentFilters.petId = '';
    currentFilters.petName = '';
    currentPage = 1;
    
    window.history.replaceState({}, '', '/public/modules/dashboard/dashboard-services.html');
    
    if (headerTitle) headerTitle.textContent = 'Historial de Servicios';
    
    applyFiltersAndRender();
};

// --- MODAL DE DETALLES ---
const openServiceDetailsModal = (service) => {
    selectedService = service;
    if (!service) return;

    const ownerProfile = service.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin cliente';

    const petName = service.pets?.name || 'Sin mascota';
    
    // **** INICIO DE LA CORRECCIÓN 2 ****
    // Forzar mayúsculas en la visualización
    const paymentMethod = (service.payment_method || 'No especificado').toUpperCase();
    // **** FIN DE LA CORRECCIÓN 2 ****
    
    const cost = service.service_price ? `S/ ${service.service_price.toFixed(2)}` : 'No especificado';
    const finalWeight = service.final_weight ? `${service.final_weight} kg` : 'No registrado';
    const observations = service.final_observations || 'Sin observaciones';
    const shampooUsed = service.shampoo_type || 'General';

    const photos = service.appointment_photos || [];
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
    const departurePhoto = photos.find(p => p.photo_type === 'departure');

    const arrivalPhotoHTML = arrivalPhoto 
        ? `<img src="${arrivalPhoto.image_url}" alt="Foto de llegada" class="rounded-lg object-cover w-full h-full">`
        : `<div class="text-gray-400 text-sm">Sin foto</div>`;

    const departurePhotoHTML = departurePhoto 
        ? `<img src="${departurePhoto.image_url}" alt="Foto de salida" class="rounded-lg object-cover w-full h-full">`
        : `<div class="text-gray-400 text-sm">Sin foto</div>`;

    const receiptHTML = service.invoice_pdf_url
        ? `<a href="${service.invoice_pdf_url}" target="_blank" class="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium">
            <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ver boleta cargada
        </a>`
        : `<p class="text-gray-500 text-sm">No se cargó boleta</p>`;

    modalServiceDetailsView.innerHTML = `
        <div class="space-y-6">
            <div class="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-100">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cliente</h4>
                        <p class="text-lg font-bold text-gray-900">${ownerName}</p>
                    </div>
                    <div>
                        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mascota</h4>
                        <p class="text-lg font-bold text-gray-900">${petName}</p>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fecha del Servicio</h4>
                    <p class="text-base text-gray-900 font-medium">${new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hora</h4>
                    <p class="text-base text-gray-900 font-medium">${service.appointment_time}</p>
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Servicio Realizado</h4>
                <p class="text-base text-gray-900">${service.service || 'Servicio general'}</p>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Shampoo Utilizado</h4>
                <p class="text-base text-gray-900 font-medium">${shampooUsed}</p>
            </div>
            
            <div>
                <h4 class="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Fotos del Servicio</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p class="text-sm font-semibold text-gray-600 mb-3">Foto de Llegada</p>
                        <div class="bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden border-2 border-gray-200">
                            ${arrivalPhotoHTML}
                        </div>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-600 mb-3">Foto de Salida</p>
                        <div class="bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden border-2 border-gray-200">
                            ${departurePhotoHTML}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Costo Total</h4>
                    <p class="text-2xl font-bold text-green-600">${cost}</p>
                </div>
                <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Método de Pago</h4>
                    <p class="text-base font-medium text-gray-900">${paymentMethod}</p>
                </div>
                <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Peso Final</h4>
                    <p class="text-lg font-bold text-gray-900">${finalWeight}</p>
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Boleta / Comprobante</h4>
                ${receiptHTML}
            </div>
            
            <div class="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-500">
                <h4 class="text-sm font-bold text-gray-800 mb-3">Observaciones Finales</h4>
                <p class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">${observations}</p>
            </div>
        </div>
    `;

    switchToViewMode();
    serviceDetailsModal.classList.remove('hidden');
};

const closeModal = () => {
    serviceDetailsModal.classList.add('hidden');
    selectedService = null;
    resetEditForm();
};

const switchToViewMode = () => {
    modalServiceDetailsView.classList.remove('hidden');
    modalServiceEditForm.classList.add('hidden');
    editServiceBtn.classList.remove('hidden');
    saveServiceBtn.classList.add('hidden');
    cancelEditBtn.classList.add('hidden');
    resetEditForm();
};

const switchToEditMode = () => {
    if (!selectedService) return;

    newArrivalFile = null;
    newDepartureFile = null;
    newReceiptFile = null;
    deleteArrivalPhoto = false;
    deleteDeparturePhoto = false;
    deleteReceipt = false;

    editServicePriceInput.value = selectedService.service_price || '';
    
    // **** INICIO DE LA CORRECCIÓN 3 ****
    // Convertir el valor a MAYÚSCULAS antes de asignarlo al select
    editPaymentMethodSelect.value = (selectedService.payment_method || '').toUpperCase();
    if (!editPaymentMethodSelect.value) {
        editPaymentMethodSelect.value = ""; // Si es null o "", vuelve a "Seleccionar..."
    }
    // **** FIN DE LA CORRECCIÓN 3 ****

    editFinalWeightInput.value = selectedService.final_weight || '';
    editFinalObservationsTextarea.value = selectedService.final_observations || '';

    const photos = selectedService.appointment_photos || [];
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
    const departurePhoto = photos.find(p => p.photo_type === 'departure');

    if (arrivalPhoto) {
        editArrivalPhotoPreview.innerHTML = `<img src="${arrivalPhoto.image_url}" alt="Foto de llegada" class="w-full h-full object-cover rounded-lg">`;
    } else {
        editArrivalPhotoPreview.innerHTML = '<p class="text-sm text-gray-400">Sin foto de llegada</p>';
    }

    if (departurePhoto) {
        editDeparturePhotoPreview.innerHTML = `<img src="${departurePhoto.image_url}" alt="Foto de salida" class="w-full h-full object-cover rounded-lg">`;
    } else {
        editDeparturePhotoPreview.innerHTML = '<p class="text-sm text-gray-400">Sin foto de salida</p>';
    }

    if (selectedService.invoice_pdf_url) {
        editReceiptPreview.innerHTML = `<a href="${selectedService.invoice_pdf_url}" target="_blank" class="text-blue-600 hover:underline text-sm">📄 Ver boleta actual</a>`;
    } else {
        editReceiptPreview.innerHTML = '<p class="text-sm text-gray-400 text-center">Sin boleta cargada</p>';
    }

    modalServiceDetailsView.classList.add('hidden');
    modalServiceEditForm.classList.remove('hidden');
    editServiceBtn.classList.add('hidden');
    saveServiceBtn.classList.remove('hidden');
    cancelEditBtn.classList.remove('hidden');
};

const resetEditForm = () => {
    editServicePriceInput.value = '';
    editPaymentMethodSelect.value = '';
    editFinalWeightInput.value = '';
    editFinalObservationsTextarea.value = '';
    editArrivalPhotoInput.value = '';
    editDeparturePhotoInput.value = '';
    editReceiptInput.value = '';
    editArrivalPhotoPreview.innerHTML = '<p class="text-sm text-gray-400">Sin foto de llegada</p>';
    editDeparturePhotoPreview.innerHTML = '<p class="text-sm text-gray-400">Sin foto de salida</p>';
    editReceiptPreview.innerHTML = '<p class="text-sm text-gray-400 text-center">Sin boleta cargada</p>';
    editMessage.classList.add('hidden');
    newArrivalFile = null;
    newDepartureFile = null;
    newReceiptFile = null;
    deleteArrivalPhoto = false;
    deleteDeparturePhoto = false;
    deleteReceipt = false;
};

const handleSaveChanges = async () => {
    if (!selectedService) return;

    const price = parseFloat(editServicePriceInput.value);
    
    // **** INICIO DE LA CORRECCIÓN 4 ****
    // El valor del select ya está en MAYÚSCULAS
    const paymentMethod = editPaymentMethodSelect.value;
    // **** FIN DE LA CORRECCIÓN 4 ****

    if (!price || price <= 0) {
        editMessage.textContent = '❌ El precio del servicio debe ser mayor a 0';
        editMessage.className = 'block text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
        editMessage.classList.remove('hidden');
        return;
    }

    if (!paymentMethod) {
        editMessage.textContent = '❌ Debe seleccionar un método de pago';
        editMessage.className = 'block text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
        editMessage.classList.remove('hidden');
        return;
    }

    saveServiceBtn.disabled = true;
    saveServiceBtn.textContent = 'Guardando...';
    editMessage.textContent = '⏳ Guardando cambios...';
    editMessage.className = 'block text-center text-sm font-medium p-3 rounded-lg bg-blue-100 text-blue-700';
    editMessage.classList.remove('hidden');

    try {
        if (deleteArrivalPhoto) {
            const { error } = await supabase
                .from('appointment_photos')
                .delete()
                .eq('appointment_id', selectedService.id)
                .eq('photo_type', 'arrival');
            if (error) console.error('Error al eliminar foto de llegada:', error);
        }

        if (deleteDeparturePhoto) {
            const { error } = await supabase
                .from('appointment_photos')
                .delete()
                .eq('appointment_id', selectedService.id)
                .eq('photo_type', 'departure');
            if (error) console.error('Error al eliminar foto de salida:', error);
        }

        if (newArrivalFile) {
            await uploadAppointmentPhoto(selectedService.id, newArrivalFile, 'arrival');
        }

        if (newDepartureFile) {
            await uploadAppointmentPhoto(selectedService.id, newDepartureFile, 'departure');
        }

        if (deleteReceipt && selectedService.invoice_pdf_url) {
            await supabase
                .from('appointments')
                .update({ invoice_pdf_url: null })
                .eq('id', selectedService.id);
        }

        if (newReceiptFile) {
            await uploadReceiptFile(selectedService.id, newReceiptFile);
        }

        const updatedData = {
            service_price: price,
            payment_method: paymentMethod, // Ya está en MAYÚSCULAS
            final_weight: parseFloat(editFinalWeightInput.value) || null,
            final_observations: editFinalObservationsTextarea.value.trim()
        };

        const { error } = await supabase
            .from('appointments')
            .update(updatedData)
            .eq('id', selectedService.id);
        
        if (error) throw error;

        editMessage.textContent = '✅ Cambios guardados exitosamente';
        editMessage.className = 'block text-center text-sm font-medium p-3 rounded-lg bg-green-100 text-green-700';

        allCompletedServices = await getCompletedServices();
        const updatedService = allCompletedServices.find(s => s.id === selectedService.id);
        if (updatedService) {
            selectedService = updatedService;
            openServiceDetailsModal(updatedService);
        }
        applyFiltersAndRender();

        setTimeout(() => {
            editMessage.classList.add('hidden');
        }, 3000);

    } catch (error) {
        console.error('Error al guardar cambios:', error);
        editMessage.textContent = '❌ Error al guardar los cambios';
        editMessage.className = 'block text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
    } finally {
        saveServiceBtn.disabled = false;
        saveServiceBtn.textContent = '💾 Guardar Cambios';
    }
};

const setupPhotoListeners = () => {
    editArrivalPhotoBtn.addEventListener('click', () => editArrivalPhotoInput.click());
    editArrivalPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            newArrivalFile = file;
            deleteArrivalPhoto = false;
            const reader = new FileReader();
            reader.onload = (event) => {
                editArrivalPhotoPreview.innerHTML = `<img src="${event.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
            };
            reader.readAsDataURL(file);
        }
    });
    removeArrivalPhotoBtn.addEventListener('click', () => {
        deleteArrivalPhoto = true;
        newArrivalFile = null;
        editArrivalPhotoInput.value = '';
        editArrivalPhotoPreview.innerHTML = '<p class="text-sm text-gray-400">Sin foto de llegada</p>';
    });

    editDeparturePhotoBtn.addEventListener('click', () => editDeparturePhotoInput.click());
    editDeparturePhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            newDepartureFile = file;
            deleteDeparturePhoto = false;
            const reader = new FileReader();
            reader.onload = (event) => {
                editDeparturePhotoPreview.innerHTML = `<img src="${event.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
            };
            reader.readAsDataURL(file);
        }
    });
    removeDeparturePhotoBtn.addEventListener('click', () => {
        deleteDeparturePhoto = true;
        newDepartureFile = null;
        editDeparturePhotoInput.value = '';
        editDeparturePhotoPreview.innerHTML = '<p class="text-sm text-gray-400">Sin foto de salida</p>';
    });

    editReceiptBtn.addEventListener('click', () => editReceiptInput.click());
    editReceiptInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            newReceiptFile = file;
            deleteReceipt = false;
            editReceiptPreview.innerHTML = `<p class="text-sm text-green-600 text-center">✅ Nuevo archivo seleccionado: ${file.name}</p>`;
        }
    });
    removeReceiptBtn.addEventListener('click', () => {
        deleteReceipt = true;
        newReceiptFile = null;
        editReceiptInput.value = '';
        editReceiptPreview.innerHTML = '<p class="text-sm text-gray-400 text-center">Sin boleta cargada</p>';
    });
};

const attachServiceRowListeners = () => {
    document.querySelectorAll('.view-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const serviceId = row.dataset.serviceId;
            const service = allCompletedServices.find(s => s.id == serviceId);
            if (service) openServiceDetailsModal(service);
        });
    });
};

const initializeServicesPage = async () => {
    // --- INICIO: Check URL for params ---
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const dateParam = urlParams.get('date');
    // Mantener soporte para petId para no romper enlaces viejos, pero priorizar búsqueda
    const petIdFromUrl = urlParams.get('pet'); 

    if (searchParam) { 
        serviceSearchInput.value = searchParam;
    } else if (petIdFromUrl) {
        currentFilters.petId = petIdFromUrl;
    }

    if (dateParam) {
        serviceDateFilter.value = dateParam;
    }
    // --- FIN ---

    if (headerTitle) headerTitle.textContent = 'Historial de Servicios';

    servicesTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Cargando servicios...</td></tr>';

    allCompletedServices = await getCompletedServices();
    const stats = await getServicesStats();

    if (totalServicesCount) totalServicesCount.textContent = stats.total;
    if (completedServicesCount) completedServicesCount.textContent = stats.completed;
    if (monthServicesCount) monthServicesCount.textContent = stats.month;

    applyFiltersAndRender();

    serviceSearchInput?.addEventListener('input', () => { currentPage = 1; applyFiltersAndRender(); });
    serviceDateFilter?.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });
    clearFiltersBtn?.addEventListener('click', clearFilters);
    closeServiceModal?.addEventListener('click', closeModal);

    editServiceBtn.addEventListener('click', switchToEditMode);
    cancelEditBtn.addEventListener('click', switchToViewMode);
    saveServiceBtn.addEventListener('click', handleSaveChanges);

    setupPhotoListeners();
};

initializeServicesPage();