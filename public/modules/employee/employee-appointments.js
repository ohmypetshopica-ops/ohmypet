// public/modules/employee/employee-appointments.js
// Módulo de gestión de citas

import { state, updateState } from './employee-state.js';
import { getClientsWithPets, getBookedTimesForDashboard, addAppointmentFromDashboard, uploadAppointmentPhoto, uploadReceiptFile, updateAppointmentStatus, getAppointmentPhotos } from '../dashboard/dashboard.api.js';
import { supabase } from '../../core/supabase.js';
import { addWeightRecord } from '../dashboard/pet-weight.api.js';

// --- CORRECCIÓN: NOMBRE ÚNICO PARA EVITAR CONFLICTOS ---
const EMPLOYEE_SHAMPOO_OPTIONS = [
    'Shampoo General', 'Avena', 'Pelo Blanco', 'Pelo Oscuro', 'Clorixidina',
    'Hipoalergenico', 'Junior', 'Mascarilla', 'SHAMPO PROPIO'
];

// Variables de paginación
let currentPage = 1;
const itemsPerPage = 8; // Mostrar 8 citas por página

// Elementos del DOM
let appointmentsList;
let addAppointmentBtnEmployee, addAppointmentModal, addAppointmentForm, cancelAddAppointmentBtn;
let petSelect, newAppointmentDateInput, newAppointmentTimeSelect, addAppointmentMessage;
let clientSearchInputModal, clientSearchResults, selectedClientIdInput;
let serviceSelectEmployeeModal;

// Modal de completar cita (Existente)
let completionModal, beforeImageInput, beforeImagePreview, afterImageInput, afterImagePreview;
let receiptInput, receiptContainer, finalObservationsTextarea, uploadMessage;
let cancelCompletionBtn, confirmCompletionBtn, saveDuringAppointmentBtn; // Añadido saveDuringAppointmentBtn
let currentAppointmentToComplete = null;

// --- CORRECCIÓN 1: Declarar TODAS las variables faltantes ---
let currentPetId = null; 
let arrivalPhotoFile = null;
let departurePhotoFile = null;
let receiptFile = null;

// NUEVOS ELEMENTOS PARA LA VISTA DE DETALLES
let appointmentsListView;
let appointmentDetailsView;
let backToAppointmentsListBtn;
let appointmentDetailsContent;

// Modal Historial
let historyModalEmployee, closeHistoryModalBtn, closeHistoryModalBtnBottom;
let historyPetName, historyArrivalPhoto, historyDeparturePhoto;
let historyPrice, historyWeight, historyPayment, historyShampoo, historyObservations;
let lastCompletedAppointmentData = null; 

// NUEVOS INPUTS DEL MODAL DE COMPLETAR CITA (Existente)
let servicePriceInput;
let petWeightInput;
let paymentMethodSelect;

// Elementos del Dropdown de Shampoo (Existente)
let shampooSelectToggleEmployee, shampooDropdownContentEmployee, shampooDisplayTextEmployee;

// === NUEVOS ELEMENTOS PARA TOGGLE "SERVICIO COMPLETADO" ===
let instantCompleteToggle;
let instantCompleteFieldsContainer;
let addServicePriceInput, addPaymentMethodSelect, addPetWeightInput, addFinalObservations;
let submitAddBtnText;
// Elementos para el shampoo en el modal de agregar
let shampooSelectToggleAdd, shampooDropdownContentAdd, shampooDisplayTextAdd;


// Elemento del botón de submit (agendar cita)
let submitAddAppointmentButtonEmployee;

// Elemento de paginación
let paginationContainerAppointments;

// ==================================================
// === ALERTA DINÁMICA ===
// ==================================================
const showMainAlert = (message, isError = false) => {
    const mainContent = document.querySelector('.content-area');
    if (!mainContent) return;

    const alertDiv = document.createElement('div');
    alertDiv.textContent = message;
    
    let alertClasses = "rounded-lg p-4 text-sm font-medium mb-4 shadow-md";
    if (isError) {
        alertClasses += " bg-red-100 text-red-700";
    } else {
        alertClasses += " bg-green-100 text-green-700";
    }
    alertDiv.className = alertClasses;
    alertDiv.role = "alert";

    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    mainContent.scrollTop = 0;

    setTimeout(() => {
        alertDiv.style.transition = 'opacity 0.5s ease';
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 500);
    }, 4000);
};

export const initAppointmentElements = () => {
    appointmentsList = document.getElementById('appointments-list');
    
    appointmentsListView = document.getElementById('appointments-list-view'); 
    appointmentDetailsView = document.getElementById('appointment-details-view');
    appointmentDetailsContent = document.getElementById('appointment-details-content');
    backToAppointmentsListBtn = document.getElementById('back-to-appointments-list-btn');

    historyModalEmployee = document.getElementById('history-modal-employee');
    closeHistoryModalBtn = document.getElementById('close-history-modal-btn');
    closeHistoryModalBtnBottom = document.getElementById('close-history-modal-btn-bottom');
    historyPetName = document.getElementById('history-pet-name');
    historyArrivalPhoto = document.getElementById('history-arrival-photo');
    historyDeparturePhoto = document.getElementById('history-departure-photo');
    historyPrice = document.getElementById('history-price');
    historyWeight = document.getElementById('history-weight');
    historyPayment = document.getElementById('history-payment');
    historyShampoo = document.getElementById('history-shampoo');
    historyObservations = document.getElementById('history-observations');

    paginationContainerAppointments = document.getElementById('pagination-container-appointments');

    addAppointmentBtnEmployee = document.querySelector('#add-appointment-btn-employee');
    addAppointmentModal = document.querySelector('#add-appointment-modal-employee');
    addAppointmentForm = document.querySelector('#add-appointment-form-employee');
    cancelAddAppointmentBtn = document.querySelector('#cancel-add-appointment-btn-employee');
    petSelect = document.querySelector('#pet-select-employee');
    newAppointmentDateInput = document.querySelector('#new-appointment-date-employee');
    newAppointmentTimeSelect = document.querySelector('#new-appointment-time-employee');
    serviceSelectEmployeeModal = document.querySelector('#service-select-employee-modal');
    addAppointmentMessage = document.querySelector('#add-appointment-message-employee');
    clientSearchInputModal = document.querySelector('#client-search-input-modal-employee');
    clientSearchResults = document.querySelector('#client-search-results-employee');
    selectedClientIdInput = document.querySelector('#selected-client-id-employee');
    
    completionModal = document.querySelector('#completion-modal-employee');
    beforeImageInput = document.querySelector('#before-image-input');
    beforeImagePreview = document.querySelector('#before-image-preview');
    afterImageInput = document.querySelector('#after-image-input');
    afterImagePreview = document.querySelector('#after-image-preview');
    receiptInput = document.querySelector('#receipt-input');
    receiptContainer = document.querySelector('#receipt-container');
    finalObservationsTextarea = document.querySelector('#final-observations-textarea');
    uploadMessage = document.querySelector('#upload-message');
    cancelCompletionBtn = document.querySelector('#cancel-completion-btn');
    confirmCompletionBtn = document.querySelector('#confirm-completion-btn');
    // IMPORTANTE: Inicializar el botón de guardado durante la cita
    saveDuringAppointmentBtn = document.querySelector('#save-during-appointment-btn');

    // Inputs Modal Completar (Existente)
    servicePriceInput = document.getElementById('service-price-input');
    petWeightInput = document.getElementById('pet-weight-input');
    paymentMethodSelect = document.getElementById('payment-method-select');
    shampooSelectToggleEmployee = document.getElementById('shampoo-select-toggle-employee');
    shampooDropdownContentEmployee = document.getElementById('shampoo-dropdown-content-employee');
    shampooDisplayTextEmployee = document.getElementById('shampoo-display-text-employee');
    
    submitAddAppointmentButtonEmployee = document.querySelector('button[form="add-appointment-form-employee"]');

    // --- INICIALIZAR NUEVOS ELEMENTOS DEL TOGGLE ---
    instantCompleteToggle = document.getElementById('instant-complete-toggle');
    instantCompleteFieldsContainer = document.getElementById('instant-complete-fields');
    addServicePriceInput = document.getElementById('add-service-price');
    addPaymentMethodSelect = document.getElementById('add-payment-method');
    addPetWeightInput = document.getElementById('add-pet-weight');
    addFinalObservations = document.getElementById('add-final-observations');
    submitAddBtnText = document.getElementById('submit-add-btn-text');
    
    shampooSelectToggleAdd = document.getElementById('shampoo-select-toggle-add');
    shampooDropdownContentAdd = document.getElementById('shampoo-dropdown-content-add');
    shampooDisplayTextAdd = document.getElementById('shampoo-display-text-add');
};

// --- FUNCIONES SHAMPOO CHECKLIST (REUTILIZABLE) ---
const createShampooChecklistLogic = (dropdownContent, displayText, options, checkboxClass) => {
    const updateText = () => {
        const checkedBoxes = dropdownContent.querySelectorAll(`.${checkboxClass}:checked`);
        const count = checkedBoxes.length;
        if (displayText) {
            if (count === 0) displayText.textContent = 'Seleccionar...';
            else if (count === 1) displayText.textContent = checkedBoxes[0].value;
            else displayText.textContent = `${count} seleccionados`;
        }
    };

    const render = (selected = []) => {
        if (!dropdownContent) return;
        dropdownContent.innerHTML = options.map((shampoo, index) => {
            const id = `${checkboxClass}-${index}`;
            const isChecked = selected.some(s => s.trim() === shampoo);
            return `
                <label for="${id}" class="flex items-center hover:bg-gray-50 p-1 rounded-md cursor-pointer">
                    <input id="${id}" type="checkbox" value="${shampoo}" class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 ${checkboxClass}" ${isChecked ? 'checked' : ''}>
                    <span class="ml-2 text-sm text-gray-700">${shampoo}</span>
                </label>`;
        }).join('');
        
        dropdownContent.querySelectorAll(`.${checkboxClass}`).forEach(cb => {
            cb.addEventListener('change', updateText);
        });
        updateText();
    };

    const getSelected = () => {
        const checked = dropdownContent.querySelectorAll(`.${checkboxClass}:checked`);
        return Array.from(checked).map(cb => cb.value).join(',');
    };

    return { render, getSelected };
};

// Instancias de Shampoo Logic
let modalCompletionShampoo;
let modalAddShampoo;


// --- GESTIÓN DEL TOGGLE ---
const handleToggleInstantComplete = (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
        instantCompleteFieldsContainer.classList.remove('hidden');
        submitAddBtnText.textContent = 'Guardar Servicio Completado';
        submitAddBtnText.classList.remove('bg-green-600', 'hover:bg-green-700');
        submitAddBtnText.classList.add('bg-blue-600', 'hover:bg-blue-700');
        // Renderizar shampoo en el modal de agregar si no está hecho
        if (modalAddShampoo) modalAddShampoo.render([]);
    } else {
        instantCompleteFieldsContainer.classList.add('hidden');
        submitAddBtnText.textContent = 'Confirmar Cita';
        submitAddBtnText.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        submitAddBtnText.classList.add('bg-green-600', 'hover:bg-green-700');
    }
};


const showAppointmentsList = () => {
    appointmentsListView?.classList.remove('hidden');
    appointmentDetailsView?.classList.add('hidden');
};

const fetchLastCompletedAppointment = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, appointment_date, final_observations, final_weight, service, shampoo_type,
            service_price, payment_method,
            appointment_photos ( photo_type, image_url ) 
        `)
        .eq('pet_id', petId)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        return null;
    }
    return data;
};

const fetchPetDetails = async (petId) => {
    const { data, error } = await supabase
        .from('pets')
        .select(`observations`)
        .eq('id', petId)
        .single();
        
    if (error && error.code !== 'PGRST116') {
        return null;
    }
    return data;
};

const openAppointmentDetails = async (appointmentId) => {
    const currentAppointment = state.allAppointments.find(app => app.id === appointmentId);
    if (!currentAppointment) return;
    
    const petId = currentAppointment.pet_id;
    
    appointmentsListView?.classList.add('hidden');
    appointmentDetailsView?.classList.remove('hidden');
    
    appointmentDetailsContent.innerHTML = '<p class="text-center text-gray-500 py-8">Cargando detalles de historial...</p>';

    const [lastCompleted, petDetails] = await Promise.all([
        fetchLastCompletedAppointment(petId),
        fetchPetDetails(petId)
    ]);
    
    lastCompletedAppointmentData = lastCompleted;
    
    const ownerProfile = currentAppointment.profiles;
    let ownerName = 'N/A';
    let clientPhone = 'N/A';
    
    if (ownerProfile) {
        const firstName = ownerProfile.first_name || '';
        const lastName = ownerProfile.last_name || '';
        const fullName = ownerProfile.full_name || '';
        clientPhone = ownerProfile.phone || 'N/A';
        
        if (firstName.trim() !== '' || lastName.trim() !== '') {
            ownerName = `${firstName} ${lastName}`.trim();
        } 
        
        if (ownerName.trim() === '' || ownerName === 'N/A') {
             if (fullName.trim() !== '' && !fullName.includes('@')) {
                 ownerName = fullName.trim();
             }
        }
        
        if (ownerName.trim() === '' || ownerName === 'N/A') {
            ownerName = ownerProfile.email || 'N/A';
        }
    }
        
    const petName = currentAppointment.pets?.name || 'N/A';
    
    const petImage = currentAppointment.pets?.image_url 
        ? currentAppointment.pets.image_url 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(petName || 'M')}&background=10B981&color=FFFFFF`;
    
    const statusClass = currentAppointment.status === 'confirmada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    const statusText = currentAppointment.status.charAt(0).toUpperCase() + currentAppointment.status.slice(1);
    
    appointmentDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg border border-gray-200">
            <h4 class="text-2xl font-bold text-gray-800 mb-4">Detalles de Cita</h4>
            <div class="flex items-center space-x-4 mb-4">
                <img src="${petImage}" alt="${petName}" class="w-16 h-16 rounded-full object-cover flex-shrink-0">
                <div>
                    <p class="font-bold text-xl text-gray-800">${petName}</p>
                    <p class="text-sm text-gray-600">Cliente: ${ownerName}</p>
                    <p class="text-sm text-gray-600">Teléfono: <a href="tel:${clientPhone}" class="text-blue-600">${clientPhone}</a></p>
                </div>
            </div>
            
            <div class="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <h5 class="text-md font-semibold text-gray-800 mb-2">Cita Programada</h5>
                <div class="grid grid-cols-2 gap-y-2 text-sm">
                    <p class="col-span-2"><strong>Servicio:</strong> ${currentAppointment.service || 'N/A'}</p>
                    <p><strong>Fecha:</strong> ${currentAppointment.appointment_date}</p>
                    <p><strong>Hora:</strong> ${currentAppointment.appointment_time.slice(0, 5)}</p>
                    <p class="col-span-2"><strong>Estado:</strong> <span class="font-semibold ${statusClass} px-2 py-0.5 rounded">${statusText}</span></p>
                    <p class="col-span-2 mt-2"><strong>Instrucciones:</strong> ${currentAppointment.notes || 'Ninguna instrucción inicial.'}</p>
                </div>
            </div>

            <div class="mb-6 p-4 rounded-xl border border-yellow-200 bg-yellow-50">
                <h5 class="text-sm font-semibold text-yellow-700 mb-1">Observaciones Permanentes (Mascota)</h5>
                <p class="text-sm text-gray-800">${petDetails?.observations || 'No hay observaciones permanentes registradas.'}</p>
            </div>
            
            <div id="history-block-button" class="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50 ${lastCompleted ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}">
                <h5 class="text-sm font-semibold text-gray-700 mb-2">Historial - Último Servicio Completo</h5>
                ${lastCompleted ? `
                    <div class="space-y-1 text-sm">
                        <p><strong>Fecha:</strong> ${lastCompleted.appointment_date} (${lastCompleted.service})</p>
                        <p><strong>Shampoo:</strong> ${lastCompleted.shampoo_type || 'General'}</p>
                        <p><strong>Peso Final:</strong> ${lastCompleted.final_weight ? `${lastCompleted.final_weight} kg` : 'N/A'}</p>
                        <p><strong>Observaciones:</strong> ${lastCompleted.final_observations || 'Sin observaciones finales.'}</p>
                        <p class="text-xs text-blue-600 font-semibold text-right mt-2">Ver detalles y fotos &rarr;</p>
                    </div>
                ` : '<p class="text-sm text-gray-500">No se encontró historial de citas completadas.</p>'}
            </div>

            <button id="detail-complete-btn" data-appointment-id="${appointmentId}"
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors mt-6">
                ✓ Completar Cita
            </button>
        </div>
    `;
    
    document.getElementById('detail-complete-btn')?.addEventListener('click', (e) => {
        // --- CORRECCIÓN 2: Usar currentAppointment capturado en el closure ---
        openCompletionModal(appointmentId, currentAppointment.pets?.name, currentAppointment.pet_id);
    });

    const historyBlock = document.getElementById('history-block-button');
    if (historyBlock && lastCompletedAppointmentData) {
        historyBlock.addEventListener('click', () => {
            openHistoryModal(lastCompletedAppointmentData, petName);
        });
    }
};


export const setupAppointmentListeners = () => {
    // Inicializar lógica de shampoos
    modalCompletionShampoo = createShampooChecklistLogic(shampooDropdownContentEmployee, shampooDisplayTextEmployee, EMPLOYEE_SHAMPOO_OPTIONS, 'shampoo-checkbox');
    modalAddShampoo = createShampooChecklistLogic(shampooDropdownContentAdd, shampooDisplayTextAdd, EMPLOYEE_SHAMPOO_OPTIONS, 'shampoo-checkbox-add');

    addAppointmentBtnEmployee?.addEventListener('click', openAddAppointmentModal);
    cancelAddAppointmentBtn?.addEventListener('click', closeAddAppointmentModal);
    
    addAppointmentForm?.addEventListener('submit', handleAddAppointment);
    
    clientSearchInputModal?.addEventListener('input', handleClientSearchInModal);
    newAppointmentDateInput?.addEventListener('change', handleDateChange);
    
    backToAppointmentsListBtn?.addEventListener('click', showAppointmentsList);
    
    appointmentsList?.addEventListener('click', (e) => {
        const item = e.target.closest('.appointment-list-item');
        if (item) {
            openAppointmentDetails(item.dataset.appointmentId);
        }
    });
    
    cancelCompletionBtn?.addEventListener('click', closeCompletionModal);
    confirmCompletionBtn?.addEventListener('click', handleCompleteAppointment);
    
    // --- CORRECCIÓN 3: Listeners para inputs de archivo ---
    beforeImageInput?.addEventListener('change', (e) => {
        handleImagePreview(e, beforeImagePreview);
        if(e.target.files[0]) arrivalPhotoFile = e.target.files[0];
    });
    afterImageInput?.addEventListener('change', (e) => {
        handleImagePreview(e, afterImagePreview);
        if(e.target.files[0]) departurePhotoFile = e.target.files[0];
    });
    receiptInput?.addEventListener('change', (e) => {
        // Lógica simple para preview de boleta si se desea, por ahora solo asignamos
        if (receiptContainer) {
             const file = e.target.files[0];
             if (file) {
                 receiptFile = file;
                 receiptContainer.innerHTML = `<p class="text-sm text-green-600">✓ ${file.name}</p>`;
             }
        }
    });

    // Botón para guardar progreso
    saveDuringAppointmentBtn?.addEventListener('click', handleSaveProgress);

    // Toggle Shampoo Modal Completar
    shampooSelectToggleEmployee?.addEventListener('click', (e) => {
        e.stopPropagation();
        shampooDropdownContentEmployee?.classList.toggle('hidden');
    });

    // Toggle Shampoo Modal Agregar
    shampooSelectToggleAdd?.addEventListener('click', (e) => {
        e.stopPropagation();
        shampooDropdownContentAdd?.classList.toggle('hidden');
    });

    // Toggle Switch Instant Complete
    instantCompleteToggle?.addEventListener('change', handleToggleInstantComplete);

    document.addEventListener('click', (e) => {
        if (!shampooSelectToggleEmployee?.contains(e.target) && !shampooDropdownContentEmployee?.contains(e.target)) {
            shampooDropdownContentEmployee?.classList.add('hidden');
        }
        if (!shampooSelectToggleAdd?.contains(e.target) && !shampooDropdownContentAdd?.contains(e.target)) {
            shampooDropdownContentAdd?.classList.add('hidden');
        }
    });

    closeHistoryModalBtn?.addEventListener('click', closeHistoryModal);
    closeHistoryModalBtnBottom?.addEventListener('click', closeHistoryModal);
    historyModalEmployee?.addEventListener('click', (e) => {
        if (e.target === historyModalEmployee) closeHistoryModal();
    });
};


const extractNotes = (app) => {
    let serviceDisplay = app.service || 'Servicio general';
    let notesDisplay = '';

    if (app.notes) {
        notesDisplay = app.notes;
    } else if (app.service?.includes('. Notas:')) {
        const parts = app.service.split('. Notas:');
        serviceDisplay = parts[0].trim();
        notesDisplay = parts.length > 1 ? parts[1].trim() : '';
    }

    return { serviceDisplay, notesDisplay };
};

// ====== FUNCIÓN DE PAGINACIÓN ======
const renderPagination = (totalItems) => {
    if (!paginationContainerAppointments) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        paginationContainerAppointments.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center space-x-2 mt-4">';

    const prevDisabled = currentPage === 1;
    paginationHTML += `
        <button data-page="${currentPage - 1}" 
                class="px-3 py-2 border rounded-lg transition-colors ${prevDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}" 
                ${prevDisabled ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
        </button>
    `;

    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage 
            ? 'bg-green-600 text-white' 
            : 'bg-white hover:bg-gray-50 text-gray-700';
        paginationHTML += `
            <button data-page="${i}" 
                    class="w-10 h-10 border rounded-lg font-medium transition-colors ${activeClass}">
                ${i}
            </button>
        `;
    }

    const nextDisabled = currentPage === totalPages;
    paginationHTML += `
        <button data-page="${currentPage + 1}" 
                class="px-3 py-2 border rounded-lg transition-colors ${nextDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700'}" 
                ${nextDisabled ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        </button>
    `;

    paginationHTML += '</div>';
    paginationContainerAppointments.innerHTML = paginationHTML;

    paginationContainerAppointments.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const newPage = parseInt(button.dataset.page);
            if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                renderConfirmedAppointments();
            }
        });
    });
};

export const renderConfirmedAppointments = () => {
    if (!appointmentsList) return;
    
    let workingAppointments = state.allAppointments
        .filter(app => app.status === 'confirmada' || app.status === 'pendiente'); 
    
    workingAppointments.sort((a, b) => 
        new Date(`${a.appointment_date}T${a.appointment_time}`) - new Date(`${b.appointment_date}T${b.appointment_time}`)
    );
    
    const totalAppointments = workingAppointments.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAppointments = workingAppointments.slice(startIndex, endIndex);


    if (paginatedAppointments.length === 0) {
        appointmentsList.innerHTML = `<p class="text-center text-gray-500 mt-8">No hay citas pendientes o confirmadas.</p>`;
        renderPagination(totalAppointments);
        return;
    }
    
    appointmentsList.innerHTML = paginatedAppointments.map(app => {
        const { serviceDisplay, notesDisplay } = extractNotes(app);

        const petNameRaw = app.pets?.name || 'Mascota';
        const petName = petNameRaw.split(' ')[0].length > 10 ? petNameRaw.substring(0, 10) + '...' : petNameRaw.split(' ')[0];

        const petImage = app.pets?.image_url 
            ? app.pets.image_url 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(petName || 'M')}&background=10B981&color=FFFFFF`;
        
        const ownerProfile = app.profiles;
        let ownerFirstName = 'Dueño';

        if (ownerProfile) {
            const firstName = ownerProfile.first_name || '';
            const fullName = ownerProfile.full_name || '';

            if (firstName.trim() !== '') {
                ownerFirstName = firstName.split(' ')[0];
            } else if (fullName.trim() !== '' && !fullName.includes('@')) {
                ownerFirstName = fullName.split(' ')[0];
            } else if (ownerProfile.email) {
                ownerFirstName = ownerProfile.email.split('@')[0];
            }
        }


        const statusClass = app.status === 'confirmada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        const statusText = app.status === 'confirmada' ? 'Confirmada' : 'Pendiente';

        return `
            <div class="appointment-list-item bg-white p-4 rounded-lg border hover:bg-gray-50 transition-colors duration-200 cursor-pointer" data-appointment-id="${app.id}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-3">
                        <img src="${petImage}" alt="${petNameRaw}" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
                        <div class="min-w-0 flex-1"> 
                            <p class="font-bold text-lg text-gray-800 truncate">${petName} <span class="text-sm text-gray-500 font-normal">(${ownerFirstName})</span></p>
                            <p class="text-sm text-gray-600">${serviceDisplay}</p>
                            ${notesDisplay ? `<p class="text-xs text-red-500 mt-1 truncate"><strong>Instrucciones:</strong> ${notesDisplay}</p>` : ''}
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="font-bold text-base text-gray-800">${app.appointment_date}</p>
                        <p class="text-sm text-gray-600">${app.appointment_time.slice(0, 5)}</p>
                    </div>
                </div>
                
                <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span class="text-xs font-semibold ${statusClass} px-3 py-1 rounded-full">
                        ${statusText}
                    </span>
                    
                    <button class="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    renderPagination(totalAppointments);
};

export const openAddAppointmentWithPreselection = async (client, pet) => {
    await openAddAppointmentModal();
    const clientName = (client.first_name && client.last_name) ? `${client.first_name} ${client.last_name}` : client.full_name;
    clientSearchInputModal.value = clientName;
    selectedClientIdInput.value = client.id;
    clientSearchResults.classList.add('hidden');
    
    const fullClient = state.clientsWithPets.find(c => c.id === client.id);
    if (fullClient && fullClient.pets && fullClient.pets.length > 0) {
        petSelect.innerHTML = '<option value="">Selecciona una mascota</option>' +
            fullClient.pets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        petSelect.disabled = false;
        petSelect.value = pet.id;
    } else {
        petSelect.innerHTML = '<option>No se encontraron mascotas</option>';
        petSelect.disabled = true;
    }
};

const openAddAppointmentModal = async () => {
    state.clientsWithPets = await getClientsWithPets();
    addAppointmentModal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Reset toggle
    instantCompleteToggle.checked = false;
    instantCompleteFieldsContainer.classList.add('hidden');
    submitAddBtnText.textContent = 'Confirmar Cita';
    submitAddBtnText.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    submitAddBtnText.classList.add('bg-green-600', 'hover:bg-green-700');
};

const closeAddAppointmentModal = () => {
    addAppointmentModal?.classList.add('hidden');
    document.body.style.overflow = '';
    addAppointmentForm?.reset();
    addAppointmentMessage?.classList.add('hidden');
    selectedClientIdInput.value = '';
    petSelect.innerHTML = '<option value="">Selecciona una mascota</option>';
    petSelect.disabled = true;
    clientSearchInputModal.value = '';
    
    if (submitAddAppointmentButtonEmployee) {
        submitAddAppointmentButtonEmployee.disabled = false;
    }
};

const handleClientSearchInModal = (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length < 2) {
        clientSearchResults.classList.add('hidden');
        return;
    }
    
    const matched = state.clientsWithPets.filter(c => 
        `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term)
    );
    
    clientSearchResults.innerHTML = matched.map(c => 
        `<div class="p-2 cursor-pointer hover:bg-gray-100" data-client-id="${c.id}" data-client-name="${c.first_name || ''} ${c.last_name || ''}">${c.first_name || ''} ${c.last_name || ''}</div>`
    ).join('');
    clientSearchResults.classList.remove('hidden');
    
    clientSearchResults.querySelectorAll('[data-client-id]').forEach(item => {
        item.addEventListener('click', () => {
            selectedClientIdInput.value = item.dataset.clientId;
            clientSearchInputModal.value = item.dataset.clientName;
            clientSearchResults.classList.add('hidden');
            
            const client = state.clientsWithPets.find(c => c.id === item.dataset.clientId);
            if (client && client.pets) {
                petSelect.innerHTML = '<option value="">Selecciona una mascota</option>' +
                    client.pets.map(pet => `<option value="${pet.id}">${pet.name}</option>`).join('');
                petSelect.disabled = false;
            }
        });
    });
};

const handleDateChange = async () => {
    const selectedDate = newAppointmentDateInput.value;
    if (!selectedDate) return;
    
    const bookedTimes = await getBookedTimesForDashboard(selectedDate);
    const availableHours = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30", "16:00"
    ];
    
    newAppointmentTimeSelect.innerHTML = availableHours
        .filter(time => !bookedTimes.includes(time))
        .map(time => `<option value="${time}:00">${time}</option>`)
        .join('');
    newAppointmentTimeSelect.disabled = false;
};

const handleAddAppointment = async (e) => {
    e.preventDefault();
    
    if (!submitAddAppointmentButtonEmployee) return;
    
    const isInstantComplete = instantCompleteToggle.checked;
    const formData = new FormData(addAppointmentForm);
    const clientId = selectedClientIdInput.value; 
    const serviceValue = document.querySelector('#service-select-employee-modal').value; 

    // Validar básicos
    if (!clientId || !formData.get('pet_id') || !formData.get('appointment_date') || !formData.get('appointment_time') || !serviceValue) {
        addAppointmentMessage.textContent = '❌ Faltan campos obligatorios.';
        addAppointmentMessage.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        addAppointmentMessage.classList.remove('hidden');
        return;
    }

    // Objeto base
    const appointmentData = {
        user_id: clientId,
        pet_id: formData.get('pet_id'),
        appointment_date: formData.get('appointment_date'),
        appointment_time: formData.get('appointment_time'),
        service: serviceValue,
        notes: formData.get('notes') || null,
        status: 'confirmada' // Por defecto
    };

    // Si es "Completar ahora", validar extra y actualizar estado
    if (isInstantComplete) {
        const price = parseFloat(addServicePriceInput.value);
        const method = addPaymentMethodSelect.value;
        const weight = parseFloat(addPetWeightInput.value);
        const finalObs = addFinalObservations.value;
        const shampoo = modalAddShampoo.getSelected(); // Usar lógica shampoo

        if (isNaN(price) || price <= 0) {
            alert('Para completar, ingresa un precio válido.');
            return;
        }
        if (!method) {
            alert('Selecciona un método de pago.');
            return;
        }

        appointmentData.status = 'completada';
        appointmentData.service_price = price;
        appointmentData.payment_method = method;
        appointmentData.final_weight = isNaN(weight) ? null : weight;
        appointmentData.final_observations = finalObs || null;
        appointmentData.shampoo_type = shampoo;
    }

    submitAddAppointmentButtonEmployee.disabled = true;
    submitAddAppointmentButtonEmployee.textContent = isInstantComplete ? 'Guardando...' : 'Confirmando...';

    try {
        const result = await addAppointmentFromDashboard(appointmentData);
    
        if (result.success) {
            const newAppId = result.data.id; // ID de la nueva cita

            // Si es completada
            if (isInstantComplete) {
                // Guardar peso si existe
                if (appointmentData.final_weight) {
                    await addWeightRecord(appointmentData.pet_id, appointmentData.final_weight, newAppId);
                }
                // --- CORRECCIÓN: Actualizar SIEMPRE la fecha de grooming al completar, con o sin peso ---
                await supabase.from('pets').update({ last_grooming_date: appointmentData.appointment_date }).eq('id', appointmentData.pet_id);
            }

            addAppointmentMessage.textContent = isInstantComplete ? '✅ Servicio completado registrado.' : '✅ Cita agendada con éxito';
            addAppointmentMessage.className = 'block mb-4 p-4 rounded-md bg-green-100 text-green-700';
            addAppointmentMessage.classList.remove('hidden');
            
            // Refrescar listas
            // CORRECCIÓN AQUI: Se agregó 'phone' a la selección de profiles
            const { data: appointments } = await supabase
                .from('appointments')
                .select('*, pets(name), profiles(first_name, last_name, full_name, phone)')
                .order('appointment_date', { ascending: true })
                .order('appointment_time', { ascending: true });
            
            if (appointments) {
                updateState('allAppointments', appointments);
                renderConfirmedAppointments();
            }

            // Reset y cerrar
            addAppointmentForm.reset();
            addAppointmentMessage.classList.add('hidden');
            selectedClientIdInput.value = '';
            petSelect.innerHTML = '<option value="">Selecciona una mascota</option>';
            petSelect.disabled = true;
            clientSearchInputModal.value = '';
            
            // WhatsApp (Solo si no es completada inmediata, o quizás también?)
            // Generalmente si es "Completada inmediata" el cliente está ahí y paga, no necesita confirmación de cita.
            if (!isInstantComplete) {
                try {
                    const client = state.clientsWithPets.find(c => c.id === appointmentData.user_id);
                    if (client && client.phone) {
                        const pet = client.pets.find(p => p.id === appointmentData.pet_id);
                        const petName = pet ? pet.name : 'su mascota';
                        const appointmentDate = new Date(appointmentData.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        
                        const message = `¡Hola ${client.first_name}! 👋 Te confirmamos tu cita en OhMyPet:\n\n*Mascota:* ${petName}\n*Fecha:* ${appointmentDate}\n*Hora:* ${appointmentData.appointment_time}\n*Servicio:* ${appointmentData.service}\n\n¡Te esperamos! 🐾`;
                        const whatsappUrl = `https://wa.me/51${client.phone}?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                    }
                } catch (e) { console.error('Error WhatsApp:', e); }
            }

            setTimeout(() => { closeAddAppointmentModal(); }, 1500);
            
        } else {
            throw new Error(result.error?.message || 'Error al agendar cita');
        }
    } catch (error) {
        addAppointmentMessage.textContent = `❌ ${error.message}`;
        addAppointmentMessage.className = 'block mb-4 p-4 rounded-md bg-red-100 text-red-700';
        addAppointmentMessage.classList.remove('hidden');
    } finally {
        submitAddAppointmentButtonEmployee.disabled = false;
        submitAddAppointmentButtonEmployee.textContent = isInstantComplete ? 'Guardar Servicio Completado' : 'Confirmar Cita';
    }
};

const openCompletionModal = async (appointmentId, petName, petId) => {
    currentAppointmentToComplete = appointmentId;
    currentPetId = petId; // --- CORRECCIÓN 1: Asignar el valor ---
    arrivalPhotoFile = null;
    departurePhotoFile = null;
    receiptFile = null;

    // completionModalSubtitle.textContent = `Mascota: ${petName}`; 
    finalObservationsTextarea.value = '';
    petWeightInput.value = '';
    servicePriceInput.value = '';
    paymentMethodSelect.value = '';
    
    uploadMessage.classList.add('hidden');

    const appointment = state.allAppointments.find(app => app.id == appointmentId);
    
    confirmCompletionBtn.classList.remove('hidden');
    completionModal.classList.remove('hidden');

    if (appointment) {
        finalObservationsTextarea.value = appointment.final_observations || '';
        petWeightInput.value = appointment.final_weight || '';
        servicePriceInput.value = appointment.service_price || '';
        
        paymentMethodSelect.value = (appointment.payment_method || '').toUpperCase();
        if (!paymentMethodSelect.value) {
             paymentMethodSelect.value = ""; 
        }
        
        const selectedShampoos = appointment.shampoo_type ? appointment.shampoo_type.split(',').map(s => s.trim()) : [];
        modalCompletionShampoo.render(selectedShampoos);
    } else {
        modalCompletionShampoo.render([]); 
    }

    await loadExistingPhotosAndReceipt(appointmentId);
};

const loadExistingPhotosAndReceipt = async (appointmentId) => {
    const photos = await getAppointmentPhotos(appointmentId);
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival');
    const departurePhoto = photos.find(p => p.photo_type === 'departure');

    const appointment = state.allAppointments.find(app => app.id == appointmentId);

    beforeImagePreview.innerHTML = arrivalPhoto
        ? `<img src="${arrivalPhoto.image_url}" alt="Foto de llegada" class="w-full h-full object-cover rounded-lg">`
        : `<p class="text-sm text-gray-500">Clic para subir imagen</p>`;

    afterImagePreview.innerHTML = departurePhoto
        ? `<img src="${departurePhoto.image_url}" alt="Foto de salida" class="w-full h-full object-cover rounded-lg">`
        : `<p class="text-sm text-gray-500">Clic para subir imagen</p>`;

    if (appointment && appointment.invoice_pdf_url) {
        receiptContainer.innerHTML = `<p class="text-sm text-green-600">✓ Boleta cargada</p>`;
    } else {
        receiptContainer.innerHTML = `<p class="text-sm text-gray-500">Clic para subir boleta</p>`;
    }
};

const closeCompletionModal = () => {
    completionModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentAppointmentToComplete = null;
    beforeImageInput.value = '';
    afterImageInput.value = '';
    receiptInput.value = '';
    beforeImagePreview.innerHTML = '<p class="text-sm text-gray-500">Clic para subir imagen</p>';
    afterImagePreview.innerHTML = '<p class="text-sm text-gray-500">Clic para subir imagen</p>';
    finalObservationsTextarea.value = '';
    uploadMessage?.classList.add('hidden');
    
    modalCompletionShampoo.render([]);
};

const handleImagePreview = (e, previewContainer) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewContainer.innerHTML = `<img src="${event.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
        };
        reader.readAsDataURL(file);
    }
};

// --- FUNCIÓN NUEVA: Guardar información durante la cita ---
const handleSaveProgress = async () => {
    if (!currentAppointmentToComplete) return;

    saveDuringAppointmentBtn.disabled = true;
    uploadMessage.classList.remove('hidden');
    uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-blue-100 text-blue-700';
    uploadMessage.textContent = 'Guardando información...';

    try {
        // Subir fotos si existen nuevos archivos
        if (arrivalPhotoFile) {
            uploadMessage.textContent = 'Subiendo foto de llegada...';
            await uploadAppointmentPhoto(currentAppointmentToComplete, arrivalPhotoFile, 'arrival');
            arrivalPhotoFile = null; // Resetear para no volver a subir
        }

        if (departurePhotoFile) {
            uploadMessage.textContent = 'Subiendo foto de salida...';
            await uploadAppointmentPhoto(currentAppointmentToComplete, departurePhotoFile, 'departure');
            departurePhotoFile = null;
        }

        if (receiptFile) {
            uploadMessage.textContent = 'Subiendo boleta...';
            await uploadReceiptFile(currentAppointmentToComplete, receiptFile);
            receiptFile = null;
        }

        // Recoger datos del formulario
        const observations = finalObservationsTextarea.value.trim();
        const weight = petWeightInput.value.trim();
        const price = servicePriceInput.value.trim();
        const paymentMethod = paymentMethodSelect.value;
        const shampooType = modalCompletionShampoo.getSelected();

        const updateData = {};
        if (observations) updateData.final_observations = observations;
        
        // Permitir guardar datos parciales
        if (weight) updateData.final_weight = parseFloat(weight);
        if (price) updateData.service_price = parseFloat(price);
        if (paymentMethod) updateData.payment_method = paymentMethod.toUpperCase();
        if (shampooType) updateData.shampoo_type = shampooType;

        if (Object.keys(updateData).length > 0) {
            uploadMessage.textContent = 'Guardando datos adicionales...';
            await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', currentAppointmentToComplete);
        }

        // Guardar historial de peso si hay peso
        if (weight && currentPetId) {
            uploadMessage.textContent = 'Registrando peso...';
            await addWeightRecord(currentPetId, parseFloat(weight), currentAppointmentToComplete);
        }

        uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-green-100 text-green-700';
        uploadMessage.textContent = '✓ Información guardada correctamente';

        // Refrescar estado local pero NO cerrar el modal
        // CORRECCIÓN AQUI: Se agregó 'phone' a la selección de profiles
        const { data: appointments } = await supabase.from('appointments').select('*, pets(name), profiles(first_name, last_name, full_name, phone)').order('appointment_date', { ascending: true });
        if (appointments) {
            updateState('allAppointments', appointments);
            renderConfirmedAppointments();
        }

        // Actualizar visualización de fotos/boleta en el modal con las URLs nuevas
        await loadExistingPhotosAndReceipt(currentAppointmentToComplete);

        setTimeout(() => {
            uploadMessage.classList.add('hidden');
        }, 2000);

    } catch (error) {
        console.error("Error guardando progreso:", error);
        uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
        uploadMessage.textContent = `Error al guardar: ${error.message}`;
    } finally {
        saveDuringAppointmentBtn.disabled = false;
    }
};

const handleCompleteAppointment = async () => {
    if (!currentAppointmentToComplete) return;

    const price = parseFloat(servicePriceInput.value);
    const paymentMethod = paymentMethodSelect.value;
    
    if (isNaN(price) || price <= 0) {
        alert('Por favor, ingresa un precio de servicio válido (> 0).');
        return;
    }
    if (!paymentMethod) {
        alert('Por favor, selecciona un método de pago.');
        return;
    }
    
    confirmCompletionBtn.disabled = true;
    confirmCompletionBtn.textContent = 'Procesando...';
    
    // Subida de fotos (lógica simplificada, si quedaba algo pendiente)
    if (arrivalPhotoFile) await uploadAppointmentPhoto(currentAppointmentToComplete, arrivalPhotoFile, 'arrival');
    if (departurePhotoFile) await uploadAppointmentPhoto(currentAppointmentToComplete, departurePhotoFile, 'departure');
    if (receiptFile) await uploadReceiptFile(currentAppointmentToComplete, receiptFile);

    const appointment = state.allAppointments.find(app => app.id === currentAppointmentToComplete);
    
    // Se usa la variable currentPetId que se asignó al abrir el modal
    const petId = currentPetId || appointment?.pet_id; 
    const weight = parseFloat(petWeightInput.value);

    if (petId && !isNaN(weight) && weight > 0) {
        await addWeightRecord(petId, weight, currentAppointmentToComplete);
    }
    
    const updateData = {
        status: 'completada',
        final_observations: finalObservationsTextarea.value || null,
        service_price: price,
        payment_method: paymentMethod,
        final_weight: isNaN(weight) ? null : weight,
        shampoo_type: modalCompletionShampoo.getSelected()
    };
    
    const { error } = await supabase.from('appointments').update(updateData).eq('id', currentAppointmentToComplete);
    
    if (error) {
        uploadMessage.textContent = '❌ Error al completar la cita';
        uploadMessage.classList.remove('hidden');
        confirmCompletionBtn.disabled = false;
        return;
    }
    
    uploadMessage.textContent = '✅ Cita completada con éxito';
    uploadMessage.classList.remove('hidden');
    
    // Actualizar estado local y remoto
    // CORRECCIÓN AQUI: Se agregó 'phone' a la selección de profiles
    const { data: appointments } = await supabase.from('appointments').select('*, pets(name), profiles(first_name, last_name, full_name, phone)').order('appointment_date', { ascending: true });
    if (appointments) {
        updateState('allAppointments', appointments);
        renderConfirmedAppointments();
    }
    
    // --- CORRECCIÓN: Actualizar SIEMPRE la fecha de grooming al completar ---
    if (petId) {
        const appointmentDate = appointment ? appointment.appointment_date : new Date().toISOString().split('T')[0];
        await supabase.from('pets').update({ last_grooming_date: appointmentDate }).eq('id', petId);
    }
    
    setTimeout(() => {
        closeCompletionModal();
        confirmCompletionBtn.disabled = false;
        showMainAlert('Cita completada exitosamente.', false); 
    }, 1500);
};

const openHistoryModal = (appointment, petName) => {
    if (!appointment) return;
    historyPetName.textContent = `Mascota: ${petName} (Servicio del ${appointment.appointment_date})`;
    historyPrice.textContent = appointment.service_price ? `S/ ${appointment.service_price.toFixed(2)}` : 'N/A';
    
    const photos = appointment.appointment_photos || [];
    const arrivalPhoto = photos.find(p => p.photo_type === 'arrival' || p.photo_type === 'before');
    const departurePhoto = photos.find(p => p.photo_type === 'departure' || p.photo_type === 'after');

    if (arrivalPhoto) {
        historyArrivalPhoto.innerHTML = `<img src="${arrivalPhoto.image_url}" alt="Foto de llegada" class="w-full h-full object-cover rounded-lg">`;
    } else {
        historyArrivalPhoto.innerHTML = `<p class="text-sm text-gray-500">Sin foto</p>`;
    }

    if (departurePhoto) {
        historyDeparturePhoto.innerHTML = `<img src="${departurePhoto.image_url}" alt="Foto de salida" class="w-full h-full object-cover rounded-lg">`;
    } else {
        historyDeparturePhoto.innerHTML = `<p class="text-sm text-gray-500">Sin foto</p>`;
    }

    historyWeight.textContent = appointment.final_weight ? `${appointment.final_weight} kg` : 'N/A';
    historyPayment.textContent = (appointment.payment_method || 'N/A').toUpperCase();
    historyShampoo.textContent = appointment.shampoo_type || 'General';
    historyObservations.textContent = appointment.final_observations || 'Sin observaciones.';

    historyModalEmployee?.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
};

const closeHistoryModal = () => {
    historyModalEmployee?.classList.add('hidden');
    if (completionModal?.classList.contains('hidden')) {
        document.body.style.overflow = ''; 
    }
};