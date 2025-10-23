// public/modules/employee/dashboard.js

import { supabase } from '../../core/supabase.js';
import { 
    uploadAppointmentPhoto, 
    uploadReceiptFile,
    getClientsWithPets,
    getBookedTimesForDashboard,
    addAppointmentFromDashboard,
    getProducts,
    addSale,
    updateProduct,
    registerClientFromDashboard,
    addPetFromDashboard
} from '../dashboard/dashboard.api.js';
import { addWeightRecord } from '../dashboard/pet-weight.api.js';


// --- ELEMENTOS DEL DOM ---
const headerTitle = document.getElementById('header-title');
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');
const logoutButton = document.getElementById('logout-button');

// Vistas de Clientes, Mascotas, Citas y Calendario
const clientSearch = document.getElementById('client-search');
const clientsListView = document.getElementById('clients-list-view');
const clientsList = document.getElementById('clients-list');
const clientDetailsView = document.getElementById('client-details-view');
const clientDetailsContent = document.getElementById('client-details-content');
const backToClientsBtn = document.getElementById('back-to-clients-btn');
const petSearch = document.getElementById('pet-search');
const petsListView = document.getElementById('pets-list-view');
const petsList = document.getElementById('pets-list');
const petDetailsView = document.getElementById('pet-details-view');
const petDetailsContent = document.getElementById('pet-details-content');
const backToPetsBtn = document.getElementById('back-to-pets-btn');
const appointmentsList = document.getElementById('appointments-list');
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const calendarModal = document.getElementById('calendar-modal');
const modalContent = document.getElementById('modal-content');
const modalDateTitle = document.getElementById('modal-date-title');
const modalDailyView = document.getElementById('modal-daily-view');
const modalAppointmentsList = document.getElementById('modal-appointments-list');
const modalDetailsView = document.getElementById('modal-details-view');
const modalDetailsContent = document.getElementById('modal-details-content');
const modalBackBtn = document.getElementById('modal-back-btn');

// --- ESTADO DE LA APLICACIÓN ---
let allClients = [];
let allPets = [];
let monthlyAppointments = [];
let allAppointments = [];
let currentDate = new Date();
let clientsWithPets = [];
let currentClientId = null;

// --- INICIO: VARIABLES Y ELEMENTOS PARA EL POS ---
let allProducts = [];
let cart = [];
const posViewBtn = document.getElementById('pos-view-btn');
const productSearchEmployee = document.getElementById('product-search-employee');
const productsGridEmployee = document.getElementById('products-grid-employee');
const cartItemsEmployee = document.getElementById('cart-items-employee');
const totalEmployee = document.getElementById('total-employee');
const clearCartBtnEmployee = document.getElementById('clear-cart-btn-employee');
const processSaleBtnEmployee = document.getElementById('process-sale-btn-employee');

// Modal de pago
const paymentModalEmployee = document.getElementById('payment-modal-employee');
const modalTotalElementEmployee = document.getElementById('modal-total-employee');
const customerSearchEmployee = document.getElementById('customer-search-employee');
const customerResultsEmployee = document.getElementById('customer-results-employee');
const selectedCustomerIdInputEmployee = document.getElementById('selected-customer-id-employee');
const selectedCustomerDisplayEmployee = document.getElementById('selected-customer-display-employee');
const selectedCustomerNameEmployee = document.getElementById('selected-customer-name-employee');
const clearCustomerBtnEmployee = document.getElementById('clear-customer-btn-employee');
const cancelPaymentBtnEmployee = document.getElementById('cancel-payment-btn-employee');
const confirmPaymentBtnEmployee = document.getElementById('confirm-payment-btn-employee');

// NUEVOS ELEMENTOS PARA PAGO DIVIDIDO
const paymentLinesContainer = document.getElementById('payment-lines-container');
const addPaymentLineBtn = document.getElementById('add-payment-line-btn');
const totalPaidDisplay = document.getElementById('total-paid-display');
const totalRemainingDisplay = document.getElementById('total-remaining-display');
const remainingSection = document.getElementById('remaining-section');
const changeSection = document.getElementById('change-section');
const totalChangeDisplay = document.getElementById('total-change-display');

let paymentLines = []; // Array para manejar los pagos
// --- FIN: VARIABLES Y ELEMENTOS PARA EL POS ---

// --- INICIO: LÓGICA DEL MODAL PARA AGENDAR CITAS ---

const addAppointmentBtnEmployee = document.querySelector('#add-appointment-btn-employee');
const addAppointmentModal = document.querySelector('#add-appointment-modal-employee');
const addAppointmentForm = document.querySelector('#add-appointment-form-employee');
const cancelAddAppointmentBtn = document.querySelector('#cancel-add-appointment-btn-employee');
const petSelect = document.querySelector('#pet-select-employee');
const newAppointmentDateInput = document.querySelector('#new-appointment-date-employee');
const newAppointmentTimeSelect = document.querySelector('#new-appointment-time-employee');
const addAppointmentMessage = document.querySelector('#add-appointment-message-employee');
const clientSearchInputModal = document.querySelector('#client-search-input-modal-employee');
const clientSearchResults = document.querySelector('#client-search-results-employee');
const selectedClientIdInput = document.querySelector('#selected-client-id-employee');

const addClientBtnEmployee = document.querySelector('#add-client-btn-employee');
const clientModalEmployee = document.querySelector('#client-modal-employee');
const closeClientModalButtonEmployee = document.querySelector('#close-client-modal-button-employee');
const cancelClientButtonEmployee = document.querySelector('#cancel-client-button-employee');
const clientFormEmployee = document.querySelector('#client-form-employee');
const clientFormMessageEmployee = document.querySelector('#client-form-message-employee');

const addPetToClientBtn = document.querySelector('#add-pet-to-client-btn');
const addPetModalEmployee = document.querySelector('#add-pet-modal-employee');
const closeAddPetModalButtonEmployee = document.querySelector('#close-add-pet-modal-button-employee');
const cancelAddPetButtonEmployee = document.querySelector('#cancel-add-pet-button-employee');
const addPetFormEmployee = document.querySelector('#add-pet-form-employee');
const addPetFormMessageEmployee = document.querySelector('#add-pet-form-message-employee');
const petOwnerIdInputEmployee = document.querySelector('#pet-owner-id-employee');


const openAddAppointmentModal = () => {
    addAppointmentForm.reset();
    clientSearchInputModal.value = '';
    selectedClientIdInput.value = '';
    petSelect.innerHTML = '<option>Selecciona un cliente primero</option>';
    petSelect.disabled = true;
    newAppointmentTimeSelect.innerHTML = '<option>Selecciona una fecha</option>';
    newAppointmentTimeSelect.disabled = true;
    addAppointmentMessage.classList.add('hidden');
    clientSearchResults.classList.add('hidden');
    addAppointmentModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeAddAppointmentModal = () => {
    addAppointmentModal.classList.add('hidden');
    document.body.style.overflow = '';
};

const populatePetSelect = (clientId) => {
    const selectedClient = clientsWithPets.find(c => c.id === clientId);

    if (selectedClient && selectedClient.pets.length > 0) {
        petSelect.innerHTML = '<option value="">Selecciona una mascota...</option>';
        selectedClient.pets.forEach(pet => {
            const option = new Option(pet.name, pet.id);
            petSelect.add(option);
        });
        petSelect.disabled = false;
    } else {
        petSelect.innerHTML = '<option>Este cliente no tiene mascotas registradas</option>';
        petSelect.disabled = true;
    }
};

const renderClientSearchResults = (clients) => {
    if (clients.length === 0) {
        clientSearchResults.innerHTML = `<div class="p-3 text-sm text-gray-500">No se encontraron clientes.</div>`;
    } else {
        clientSearchResults.innerHTML = clients.map(client => {
            const displayName = (client.first_name && client.last_name) ? `${client.first_name} ${client.last_name}` : client.full_name;
            return `<div class="p-3 hover:bg-gray-100 cursor-pointer text-sm" data-client-id="${client.id}" data-client-name="${displayName}">${displayName}</div>`;
        }).join('');
    }
    clientSearchResults.classList.remove('hidden');
};

const renderAvailableTimes = async () => {
    const selectedDate = newAppointmentDateInput.value;
    if (!selectedDate) {
        newAppointmentTimeSelect.innerHTML = '<option>Selecciona una fecha</option>';
        newAppointmentTimeSelect.disabled = true;
        return;
    }

    newAppointmentTimeSelect.innerHTML = '<option>Cargando...</option>';
    const bookedTimes = await getBookedTimesForDashboard(selectedDate);
    const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
    
    newAppointmentTimeSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
    hours.forEach(hour => {
        if (!bookedTimes.includes(hour)) {
            const option = new Option(hour, hour + ':00');
            newAppointmentTimeSelect.add(option);
        }
    });
    newAppointmentTimeSelect.disabled = false;
};

const initializeAddAppointmentModal = async () => {
    clientsWithPets = await getClientsWithPets();

    addAppointmentBtnEmployee.addEventListener('click', openAddAppointmentModal);
    cancelAddAppointmentBtn.addEventListener('click', closeAddAppointmentModal);
    addAppointmentModal.addEventListener('click', (e) => {
        if (e.target === addAppointmentModal) closeAddAppointmentModal();
    });

    clientSearchInputModal.addEventListener('input', () => {
        const searchTerm = clientSearchInputModal.value.toLowerCase();
        
        petSelect.innerHTML = '<option>Selecciona un cliente primero</option>';
        petSelect.disabled = true;
        selectedClientIdInput.value = '';

        if (searchTerm.length < 1) {
            clientSearchResults.classList.add('hidden');
            return;
        }

        const matchedClients = clientsWithPets.filter(client => {
            const fullName = ((client.first_name || '') + ' ' + (client.last_name || '')).toLowerCase();
            return fullName.includes(searchTerm);
        });

        renderClientSearchResults(matchedClients);
    });

    clientSearchResults.addEventListener('click', (e) => {
        const clientDiv = e.target.closest('[data-client-id]');
        if (clientDiv) {
            const clientId = clientDiv.dataset.clientId;
            const clientName = clientDiv.dataset.clientName;

            clientSearchInputModal.value = clientName;
            selectedClientIdInput.value = clientId;

            clientSearchResults.classList.add('hidden');
            populatePetSelect(clientId);
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!clientSearchInputModal.contains(e.target) && !clientSearchResults.contains(e.target)) {
            clientSearchResults.classList.add('hidden');
        }
    });

    newAppointmentDateInput.addEventListener('change', renderAvailableTimes);

    addAppointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = addAppointmentForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        const formData = new FormData(addAppointmentForm);
        const serviceValue = formData.get('service');
        const notesValue = formData.get('notes');
        
        const appointmentData = {
            user_id: formData.get('user_id'),
            pet_id: formData.get('pet_id'),
            appointment_date: formData.get('appointment_date'),
            appointment_time: formData.get('appointment_time'),
            service: serviceValue,
            notes: notesValue || null,
            status: 'confirmada'
        };

        if (!appointmentData.user_id || !appointmentData.pet_id || !appointmentData.appointment_date || !appointmentData.appointment_time || !appointmentData.service) {
            alert('Por favor, completa todos los campos obligatorios (Cliente, Mascota, Fecha, Hora y Servicio).');
            submitButton.disabled = false;
            return;
        }

        const { success, error } = await addAppointmentFromDashboard(appointmentData);

        if (success) {
            alert('¡Cita agendada con éxito!');
            
            try {
                const client = clientsWithPets.find(c => c.id === appointmentData.user_id);
                if (client && client.phone) {
                    const pet = client.pets.find(p => p.id === appointmentData.pet_id);
                    const petName = pet ? pet.name : 'su mascota';
                    const appointmentDate = new Date(appointmentData.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    
                    const message = `¡Hola ${client.first_name}! 👋 Te confirmamos tu cita en OhMyPet:\n\n*Mascota:* ${petName}\n*Fecha:* ${appointmentDate}\n*Hora:* ${appointmentData.appointment_time}\n*Servicio:* ${appointmentData.service}\n\n¡Te esperamos! 🐾`;
                    
                    const whatsappUrl = `https://wa.me/51${client.phone}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                } else {
                    alert('La cita fue agendada, pero no se pudo notificar por WhatsApp porque el cliente no tiene un número de teléfono registrado.');
                }
            } catch (e) {
                console.error('Error al intentar enviar WhatsApp:', e);
                alert('La cita fue agendada, pero ocurrió un error al intentar generar el mensaje de WhatsApp.');
            }

            closeAddAppointmentModal();
            // Recargar datos y renderizar
            const appointmentsRes = await supabase.from('appointments').select('*, pets(*), profiles(*)');
            allAppointments = appointmentsRes.data || [];
            renderConfirmedAppointments();
            await renderCalendar();
        } else {
            addAppointmentMessage.textContent = `Error: ${error.message}`;
            addAppointmentMessage.className = 'p-3 rounded-md bg-red-100 text-red-700 text-sm';
            addAppointmentMessage.classList.remove('hidden');
        }

        submitButton.disabled = false;
    });
};
// --- FIN: LÓGICA DEL MODAL PARA AGENDAR CITAS ---


// --- INICIO: LÓGICA DEL MODAL PARA COMPLETAR CITAS ---

// Elementos del DOM del modal
const completionModal = document.querySelector('#completion-modal');
const completionModalSubtitle = document.querySelector('#completion-modal-subtitle');
const finalObservationsTextarea = document.querySelector('#final-observations-textarea');
const petWeightInput = document.querySelector('#pet-weight-input');
const servicePriceInput = document.querySelector('#service-price-input');
const paymentMethodSelect = document.querySelector('#payment-method-select');
const cancelCompletionBtn = document.querySelector('#cancel-completion-btn');
const confirmCompletionBtn = document.querySelector('#confirm-completion-btn');
const arrivalPhotoContainer = document.querySelector('#arrival-photo-container');
const departurePhotoContainer = document.querySelector('#departure-photo-container');
const receiptContainer = document.querySelector('#receipt-container');
const arrivalPhotoInput = document.querySelector('#arrival-photo-input');
const departurePhotoInput = document.querySelector('#departure-photo-input');
const receiptInput = document.querySelector('#receipt-input');
const uploadMessage = document.querySelector('#upload-message');

// Estado del modal
let currentAppointmentId = null;
let currentPetId = null;
let arrivalPhotoFile = null;
let departurePhotoFile = null;
let receiptFile = null;

const openCompletionModal = (appointmentId) => {
    const appointment = allAppointments.find(app => app.id === appointmentId);
    if (!appointment) return;

    currentAppointmentId = appointmentId;
    currentPetId = appointment.pet_id;
    arrivalPhotoFile = null;
    departurePhotoFile = null;
    receiptFile = null;

    completionModalSubtitle.textContent = `Mascota: ${appointment.pets.name}`;
    finalObservationsTextarea.value = '';
    petWeightInput.value = '';
    servicePriceInput.value = '';
    paymentMethodSelect.value = '';
    uploadMessage.classList.add('hidden');
    
    arrivalPhotoContainer.innerHTML = `<p class="text-sm text-gray-500">Clic para subir foto de llegada</p>`;
    departurePhotoContainer.innerHTML = `<p class="text-sm text-gray-500">Clic para subir foto de salida</p>`;
    receiptContainer.innerHTML = `<p class="text-sm text-gray-500">Clic para subir boleta</p>`;

    completionModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeCompletionModal = () => {
    completionModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentAppointmentId = null;
    currentPetId = null;
};

const setupCompletionModalListeners = () => {
    if (cancelCompletionBtn) {
        cancelCompletionBtn.addEventListener('click', closeCompletionModal);
    }

    arrivalPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            arrivalPhotoFile = file;
            arrivalPhotoContainer.innerHTML = `<img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover rounded-lg">`;
        }
    });

    departurePhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            departurePhotoFile = file;
            departurePhotoContainer.innerHTML = `<img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover rounded-lg">`;
        }
    });

    receiptInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            receiptFile = file;
            receiptContainer.innerHTML = `<p class="text-sm text-green-600">✓ ${file.name}</p>`;
        }
    });

    confirmCompletionBtn.addEventListener('click', async () => {
        const weight = petWeightInput.value.trim();
        const price = servicePriceInput.value.trim();
        const paymentMethod = paymentMethodSelect.value;
        
        if (!price || !paymentMethod) {
            alert(`Para completar la cita, debes agregar el precio y el método de pago.`);
            return;
        }

        confirmCompletionBtn.disabled = true;
        confirmCompletionBtn.textContent = 'Procesando...';
        uploadMessage.classList.remove('hidden');
        uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-blue-100 text-blue-700';
        uploadMessage.textContent = 'Guardando datos...';

        try {
            if (arrivalPhotoFile) await uploadAppointmentPhoto(currentAppointmentId, arrivalPhotoFile, 'arrival');
            if (departurePhotoFile) await uploadAppointmentPhoto(currentAppointmentId, departurePhotoFile, 'departure');
            if (receiptFile) await uploadReceiptFile(currentAppointmentId, receiptFile);
            if (weight) await addWeightRecord(currentPetId, parseFloat(weight), currentAppointmentId);

            const observations = finalObservationsTextarea.value.trim();
            const appointment = allAppointments.find(app => app.id === currentAppointmentId);

            const { error } = await supabase.from('appointments')
                .update({
                    status: 'completada',
                    final_observations: observations,
                    final_weight: weight ? parseFloat(weight) : null,
                    service_price: parseFloat(price),
                    payment_method: paymentMethod
                }).eq('id', currentAppointmentId);

            if (error) throw error;

            await supabase.from('pets')
                .update({ last_grooming_date: appointment.appointment_date })
                .eq('id', currentPetId);
                
            const index = allAppointments.findIndex(app => app.id === currentAppointmentId);
            if (index > -1) allAppointments[index].status = 'completada';
            renderConfirmedAppointments();

            closeCompletionModal();
            alert('✓ Cita completada exitosamente');

        } catch (error) {
            uploadMessage.className = 'text-center text-sm font-medium p-3 rounded-lg bg-red-100 text-red-700';
            uploadMessage.textContent = `Error: ${error.message}`;
        } finally {
            confirmCompletionBtn.disabled = false;
            confirmCompletionBtn.textContent = '✓ Completar Cita';
        }
    });
};

// --- FIN: LÓGICA DEL MODAL ---


// --- FUNCIONES AUXILIARES ---
const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    return `${years} años y ${months} meses`;
};

// --- LÓGICA DE NAVEGACIÓN Y VISTAS ---
const showView = (viewId) => {
    views.forEach(view => view.classList.add('hidden'));
    document.getElementById(`${viewId}-view`).classList.remove('hidden');

    navButtons.forEach(btn => {
        const isActive = btn.dataset.view === viewId;
        btn.classList.toggle('text-green-600', isActive);
        btn.classList.toggle('border-t-2', isActive);
        btn.classList.toggle('border-green-600', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
        if (isActive) headerTitle.textContent = btn.querySelector('span').textContent;
    });
    
    posViewBtn.classList.remove('text-green-600');
    posViewBtn.classList.add('text-gray-500');
};

// --- INICIO: LÓGICA DEL PUNTO DE VENTA (POS) ---

const showPOSView = () => {
    views.forEach(view => view.classList.add('hidden'));
    document.getElementById('pos-view').classList.remove('hidden');
    navButtons.forEach(btn => {
        btn.classList.remove('text-green-600', 'border-t-2', 'border-green-600');
        btn.classList.add('text-gray-500');
    });
    posViewBtn.classList.add('text-green-600');
    headerTitle.textContent = 'Punto de Venta';
};

const renderProductsEmployee = (products) => {
    productsGridEmployee.innerHTML = products.map(product => `
        <div class="bg-white border rounded-lg p-2 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer" data-product-id="${product.id}">
            <img src="${product.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=D1D5DB&color=FFFFFF`}" alt="${product.name}" class="w-full h-20 object-cover rounded-md mb-2">
            <h3 class="font-semibold text-xs leading-tight h-8 line-clamp-2">${product.name}</h3>
            <p class="text-sm font-bold text-green-600 mt-1">S/ ${product.price.toFixed(2)}</p>
        </div>
    `).join('');
    
    productsGridEmployee.querySelectorAll('[data-product-id]').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            const product = allProducts.find(p => p.id == productId);
            if (product) addToCartEmployee(product);
        });
    });
};

const addToCartEmployee = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        if (existingItem.quantity < product.stock) existingItem.quantity++;
        else alert('Stock máximo alcanzado');
    } else {
        if (product.stock > 0) cart.push({ ...product, quantity: 1 });
        else alert('Producto agotado');
    }
    renderCartEmployee();
};

const updateCartQuantityEmployee = (productId, newQuantity) => {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (newQuantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        } else if (newQuantity > item.stock) {
            alert('Stock máximo alcanzado');
        } else {
            item.quantity = newQuantity;
        }
    }
    renderCartEmployee();
};

const renderCartEmployee = () => {
    if (cart.length === 0) {
        cartItemsEmployee.innerHTML = `<p class="text-center text-gray-400 text-sm">Carrito vacío</p>`;
        processSaleBtnEmployee.disabled = true;
        clearCartBtnEmployee.disabled = true;
        totalEmployee.textContent = 'S/ 0.00';
        return;
    }

    cartItemsEmployee.innerHTML = cart.map(item => `
        <div class="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
            <div class="flex-1 truncate pr-2">
                <span>${item.name}</span>
                <div class="text-xs text-gray-500">S/ ${item.price.toFixed(2)} c/u</div>
            </div>
            <div class="flex items-center gap-2">
                <button class="decrease-btn-employee bg-gray-200 h-6 w-6 rounded-md flex items-center justify-center font-bold" data-product-id="${item.id}">-</button>
                <span class="font-semibold w-4 text-center">${item.quantity}</span>
                <button class="increase-btn-employee bg-gray-200 h-6 w-6 rounded-md flex items-center justify-center font-bold" data-product-id="${item.id}">+</button>
            </div>
            <div class="w-20 text-right font-bold text-gray-800 whitespace-nowrap">S/ ${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalEmployee.textContent = `S/ ${total.toFixed(2)}`;
    processSaleBtnEmployee.disabled = false;
    clearCartBtnEmployee.disabled = false;
};

const clearCartEmployee = () => {
    cart = [];
    renderCartEmployee();
};

const updatePaymentTotalsAndButtonState = () => {
    const totalToPay = parseFloat(modalTotalElementEmployee.textContent) || 0;
    
    paymentLines.forEach((line, index) => {
        const amountInput = document.getElementById(`payment-amount-${index}`);
        if (amountInput) {
            line.amount = parseFloat(amountInput.value) || 0;
        }
    });

    const totalPaid = paymentLines.reduce((sum, line) => sum + line.amount, 0);
    const remaining = totalToPay - totalPaid;

    totalPaidDisplay.textContent = `S/ ${totalPaid.toFixed(2)}`;

    if (remaining > 0.001) { 
        totalRemainingDisplay.textContent = `S/ ${remaining.toFixed(2)}`;
        remainingSection.classList.remove('hidden');
        changeSection.classList.add('hidden');
    } else {
        totalChangeDisplay.textContent = `S/ ${Math.abs(remaining).toFixed(2)}`;
        remainingSection.classList.add('hidden');
        changeSection.classList.remove('hidden');
    }

    const customerSelected = !!selectedCustomerIdInputEmployee.value;
    confirmPaymentBtnEmployee.disabled = !customerSelected || remaining > 0.001;
};

const renderPaymentLines = () => {
    paymentLinesContainer.innerHTML = '';
    paymentLines.forEach((line, index) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'flex items-center gap-2';
        lineEl.innerHTML = `
            <select id="payment-method-${index}" class="flex-1 p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 text-sm">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
            </select>
            <input type="number" id="payment-amount-${index}" step="0.01" min="0" value="${line.amount.toFixed(2)}" class="w-28 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" placeholder="0.00">
            <button type="button" data-index="${index}" class="remove-payment-line-btn p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        `;

        const removeBtn = lineEl.querySelector('.remove-payment-line-btn');
        if (paymentLines.length <= 1) {
            removeBtn.classList.add('hidden');
        }

        paymentLinesContainer.appendChild(lineEl);
        document.getElementById(`payment-method-${index}`).value = line.method;
    });

    document.querySelectorAll('.remove-payment-line-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const indexToRemove = parseInt(e.currentTarget.dataset.index);
            paymentLines.splice(indexToRemove, 1);
            renderPaymentLines();
            updatePaymentTotalsAndButtonState();
        });
    });

    document.querySelectorAll('select[id^="payment-method-"]').forEach((select, index) => {
        select.addEventListener('change', (e) => {
            paymentLines[index].method = e.target.value;
        });
    });

    document.querySelectorAll('input[id^="payment-amount-"]').forEach(input => {
        input.addEventListener('input', updatePaymentTotalsAndButtonState);
    });
};

const addPaymentLine = () => {
    const totalToPay = parseFloat(modalTotalElementEmployee.textContent) || 0;
    const totalPaid = paymentLines.reduce((sum, line) => sum + line.amount, 0);
    const remaining = Math.max(0, totalToPay - totalPaid);

    paymentLines.push({ method: 'yape', amount: remaining });
    renderPaymentLines();
    updatePaymentTotalsAndButtonState();
};
// --- FIN: NUEVAS FUNCIONES PARA PAGO DIVIDIDO ---

const openPaymentModalEmployee = () => {
    const totalToPay = parseFloat(totalEmployee.textContent.replace('S/ ', '')) || 0;
    
    paymentLines = [{ method: 'efectivo', amount: totalToPay }];
    
    selectedCustomerIdInputEmployee.value = '';
    selectedCustomerDisplayEmployee.classList.add('hidden');
    customerSearchEmployee.value = '';
    customerResultsEmployee.classList.add('hidden');
    
    modalTotalElementEmployee.textContent = totalToPay.toFixed(2);
    
    renderPaymentLines();
    updatePaymentTotalsAndButtonState();

    paymentModalEmployee.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closePaymentModalEmployee = () => {
    paymentModalEmployee.classList.add('hidden');
    document.body.style.overflow = '';
};

const processSaleEmployee = async () => {
    if (!selectedCustomerIdInputEmployee.value) {
        alert('Por favor, selecciona un cliente.');
        return;
    }

    const totalToPay = parseFloat(modalTotalElementEmployee.textContent) || 0;
    const totalPaid = paymentLines.reduce((sum, line) => sum + line.amount, 0);
    if (totalPaid < totalToPay - 0.001) { // Tolerancia para decimales
        alert('El monto pagado es menor al total de la venta.');
        return;
    }

    confirmPaymentBtnEmployee.disabled = true;
    confirmPaymentBtnEmployee.textContent = 'Procesando...';
    
    const paymentMethodString = paymentLines
        .filter(line => line.amount > 0)
        .map(line => `${line.method.charAt(0).toUpperCase() + line.method.slice(1)} (S/ ${line.amount.toFixed(2)})`)
        .join(', ');

    for (const item of cart) {
        const saleData = {
            client_id: selectedCustomerIdInputEmployee.value,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            payment_method: paymentMethodString
        };
        const { error } = await addSale(saleData);
        if (error) {
            alert('Hubo un error al registrar una de las ventas. Por favor, revisa el stock e inténtalo de nuevo.');
            console.error(error);
            confirmPaymentBtnEmployee.disabled = false;
            confirmPaymentBtnEmployee.textContent = 'Confirmar Venta';
            return;
        }
    }

    alert('Venta procesada con éxito');
    
    cart.forEach(cartItem => {
        const product = allProducts.find(p => p.id === cartItem.id);
        if (product) product.stock -= cartItem.quantity;
    });
    
    clearCartEmployee();
    closePaymentModalEmployee();
    renderProductsEmployee(allProducts);

    confirmPaymentBtnEmployee.disabled = false;
    confirmPaymentBtnEmployee.textContent = 'Confirmar Venta';
};

const initializePOSEmployee = () => {
    posViewBtn.addEventListener('click', showPOSView);
    productSearchEmployee.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderProductsEmployee(allProducts.filter(p => p.name.toLowerCase().includes(term)));
    });
    clearCartBtnEmployee.addEventListener('click', clearCartEmployee);
    processSaleBtnEmployee.addEventListener('click', openPaymentModalEmployee);
    cancelPaymentBtnEmployee.addEventListener('click', closePaymentModalEmployee);
    confirmPaymentBtnEmployee.addEventListener('click', processSaleEmployee);

    cartItemsEmployee.addEventListener('click', (e) => {
        const decreaseBtn = e.target.closest('.decrease-btn-employee');
        const increaseBtn = e.target.closest('.increase-btn-employee');

        if (decreaseBtn) {
            const productId = decreaseBtn.dataset.productId;
            const item = cart.find(i => i.id == productId);
            if (item) updateCartQuantityEmployee(productId, item.quantity - 1);
        }

        if (increaseBtn) {
            const productId = increaseBtn.dataset.productId;
            const item = cart.find(i => i.id == productId);
            if (item) updateCartQuantityEmployee(productId, item.quantity + 1);
        }
    });
    
    addPaymentLineBtn.addEventListener('click', addPaymentLine);
    
    customerSearchEmployee.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term.length < 2) { customerResultsEmployee.classList.add('hidden'); return; }
        const matched = allClients.filter(c => `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term));
        customerResultsEmployee.innerHTML = matched.map(c => `<div class="p-2 cursor-pointer hover:bg-gray-100" data-id="${c.id}" data-name="${c.first_name || ''} ${c.last_name || ''}">${c.first_name || ''} ${c.last_name || ''}</div>`).join('');
        customerResultsEmployee.classList.remove('hidden');
    });

    customerResultsEmployee.addEventListener('click', (e) => {
        const target = e.target.closest('[data-id]');
        if (target) {
            selectedCustomerIdInputEmployee.value = target.dataset.id;
            selectedCustomerNameEmployee.textContent = target.dataset.name;
            selectedCustomerDisplayEmployee.classList.remove('hidden');
            customerResultsEmployee.classList.add('hidden');
            customerSearchEmployee.value = '';
            updatePaymentTotalsAndButtonState();
        }
    });

    clearCustomerBtnEmployee.addEventListener('click', () => {
        selectedCustomerIdInputEmployee.value = '';
        selectedCustomerDisplayEmployee.classList.add('hidden');
        updatePaymentTotalsAndButtonState();
    });
};

// --- FIN DEL PUNTO DE VENTA ---


// --- SECCIÓN DE CITAS ---
const renderConfirmedAppointments = () => {
    const confirmed = allAppointments
        .filter(app => app.status === 'confirmada')
        .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`) - new Date(`${b.appointment_date}T${b.appointment_time}`));

    if (confirmed.length === 0) {
        appointmentsList.innerHTML = `<p class="text-center text-gray-500 mt-8">No hay citas confirmadas pendientes.</p>`;
        return;
    }
    appointmentsList.innerHTML = confirmed.map(app => `
        <div class="bg-white p-4 rounded-lg shadow-sm border space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-bold text-lg">${app.pets.name}</p>
                    <p class="text-sm text-gray-600">${app.profiles.first_name || ''} ${app.profiles.last_name || ''}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-green-700">${app.appointment_date}</p>
                    <p class="text-gray-500">${app.appointment_time.slice(0, 5)}</p>
                </div>
            </div>
            <div class="text-sm bg-gray-50 p-2 rounded-md">
                <p><strong>Servicio:</strong> ${app.service}</p>
            </div>
            <button data-appointment-id="${app.id}" class="complete-btn w-full bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition-colors">
                Completar Cita
            </button>
        </div>
    `).join('');
};


// --- SECCIÓN DE CLIENTES ---
const renderClients = (clients) => {
    clientsList.innerHTML = clients.length > 0 ? clients.map(client => `
        <button data-client-id="${client.id}" class="client-btn w-full text-left bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50">
            <h3 class="font-bold text-gray-800">${client.first_name || ''} ${client.last_name || ''}</h3>
            <p class="text-sm text-gray-600">${client.phone || 'Sin teléfono'}</p>
            <p class="text-sm text-gray-500">${client.email || 'Sin email'}</p>
        </button>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron clientes.</p>`;
};
const showClientDetails = (clientId) => {
    currentClientId = clientId; 
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;
    const clientPets = allPets.filter(pet => pet.owner_id === clientId);
    clientDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h3 class="font-bold text-xl mb-2">${client.first_name || ''} ${client.last_name || ''}</h3>
            <p><strong>Teléfono:</strong> <a href="tel:${client.phone}" class="text-blue-600">${client.phone || 'N/A'}</a></p>
            <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
            <p><strong>Distrito:</strong> ${client.district || 'N/A'}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Mascotas (${clientPets.length})</h4>
            <div class="space-y-3">
                ${clientPets.length > 0 ? clientPets.map(pet => `
                    <div class="bg-gray-50 p-3 rounded-lg flex items-center gap-4">
                        <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-12 w-12 rounded-full object-cover">
                        <div>
                            <p class="font-semibold">${pet.name}</p>
                            <p class="text-sm text-gray-600">${pet.breed}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">Este cliente no tiene mascotas registradas.</p>'}
            </div>
        </div>
    `;
    clientsListView.classList.add('hidden');
    clientDetailsView.classList.remove('hidden');
};
const showClientsListView = () => {
    clientDetailsView.classList.add('hidden');
    clientsListView.classList.remove('hidden');
    currentClientId = null; 
};

// --- SECCIÓN DE MASCOTAS ---
const renderPets = (pets) => {
    petsList.innerHTML = pets.length > 0 ? pets.map(pet => `
        <button data-pet-id="${pet.id}" class="pet-btn w-full text-left bg-white p-4 rounded-lg shadow-sm border hover:bg-gray-50 flex items-center gap-4">
            <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-12 w-12 rounded-full object-cover">
            <div>
                <h3 class="font-bold text-gray-800">${pet.name}</h3>
                <p class="text-sm text-gray-600">${pet.breed}</p>
                <p class="text-xs text-gray-500">Dueño: ${pet.profiles.first_name || ''} ${pet.profiles.last_name || ''}</p>
            </div>
        </button>
    `).join('') : `<p class="text-center text-gray-500 mt-8">No se encontraron mascotas.</p>`;
};
const showPetDetails = (petId) => {
    const pet = allPets.find(p => p.id === petId);
    if (!pet) return;
    const petHistory = allAppointments.filter(app => app.pet_id === petId).sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
    petDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm text-center">
            <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-24 w-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg">
            <h3 class="text-2xl font-bold mt-2">${pet.name}</h3>
            <p class="text-gray-600">${pet.breed}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Información de la Mascota</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <p><strong>Dueño:</strong> ${pet.profiles.first_name || ''} ${pet.profiles.last_name || ''}</p>
                <p><strong>Sexo:</strong> ${pet.sex || 'N/A'}</p>
                <p><strong>Edad:</strong> ${calculateAge(pet.birth_date)}</p>
                <p><strong>Peso:</strong> ${pet.weight ? pet.weight + ' kg' : 'N/A'}</p>
            </div>
            <div class="bg-yellow-50 p-2 rounded-md mt-2">
                <p class="text-xs font-semibold">Observaciones Generales:</p>
                <p class="text-xs">${pet.observations || 'Sin observaciones.'}</p>
            </div>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm">
            <h4 class="font-bold text-lg mb-2">Historial Completo</h4>
            <div class="space-y-2 max-h-48 overflow-y-auto">
                ${petHistory.length > 0 ? petHistory.map(hist => `
                    <div class="bg-gray-50 p-2 rounded-md text-sm flex justify-between items-center">
                        <p><strong>${hist.appointment_date}:</strong> ${hist.service}</p>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${hist.status === 'completada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${hist.status}</span>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No tiene historial de citas.</p>'}
            </div>
        </div>
    `;
    petsListView.classList.add('hidden');
    petDetailsView.classList.remove('hidden');
};
const showPetsListView = () => {
    petDetailsView.classList.add('hidden');
    petsListView.classList.remove('hidden');
};

// --- LÓGICA DEL MODAL DE CALENDARIO ---
const openModal = () => { 
    calendarModal.classList.remove('hidden'); 
    document.body.style.overflow = 'hidden';
    setTimeout(() => modalContent.classList.remove('translate-y-full'), 10); 
};
const closeModal = () => { 
    modalContent.classList.add('translate-y-full'); 
    document.body.style.overflow = '';
    setTimeout(() => { calendarModal.classList.add('hidden'); }, 300); 
};

// --- SECCIÓN DE CALENDARIO ---
const fetchAppointmentsForMonth = async (date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0]; const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const { data, error } = await supabase.from('appointments').select('*, pets(*), profiles(first_name, last_name)').gte('appointment_date', firstDay).lte('appointment_date', lastDay);
    if (error) { console.error("Error cargando citas del mes:", error); monthlyAppointments = []; } else { monthlyAppointments = data || []; }
};
const renderCalendar = async () => {
    await fetchAppointmentsForMonth(currentDate);
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`; calendarGrid.innerHTML = '';
    ['D', 'L', 'M', 'M', 'J', 'V', 'S'].forEach(day => { calendarGrid.innerHTML += `<div class="font-semibold text-gray-400 text-xs">${day}</div>`; });
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) calendarGrid.innerHTML += `<div></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasAppointments = monthlyAppointments.some(app => app.appointment_date === dateStr);
        const dayClass = hasAppointments ? 'bg-green-100 text-green-700 font-bold' : '';
        const todayClass = new Date().toDateString() === new Date(year, month, day).toDateString() ? 'ring-2 ring-blue-500' : '';
        calendarGrid.innerHTML += `<div data-date="${dateStr}" data-has-appointments="${hasAppointments}" class="day-cell cursor-pointer p-2 rounded-full ${todayClass} ${dayClass}">${day}</div>`;
    }
};
const renderAppointmentsInModal = (date) => {
    const appointmentsOnDay = monthlyAppointments.filter(app => app.appointment_date === date).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    modalDateTitle.textContent = `Citas del ${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    modalAppointmentsList.innerHTML = appointmentsOnDay.length > 0 ? appointmentsOnDay.map(app => `
        <button data-appointment-id="${app.id}" class="appointment-btn w-full text-left bg-white p-3 rounded-lg shadow-sm border hover:bg-gray-50 flex items-center gap-4">
            <img src="${app.pets.image_url || `https://ui-avatars.com/api/?name=${app.pets.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-12 w-12 rounded-full object-cover flex-shrink-0">
            <div>
                <p class="font-semibold">${app.appointment_time.slice(0, 5)} - ${app.pets.name}</p>
                <p class="text-sm text-gray-600">Dueño: ${app.profiles.first_name || ''} ${app.profiles.last_name || ''}</p>
                <p class="text-xs text-gray-500">${app.service}</p>
            </div>
        </button>
    `).join('') : `<p class="text-center text-gray-500">No hay citas para este día.</p>`;
};
const showAppointmentDetails = async (appointmentId) => {
    const appointment = monthlyAppointments.find(app => app.id === appointmentId);
    if (!appointment) return;
    const pet = appointment.pets;
    const { data: petHistory, error } = await supabase.from('appointments').select('appointment_date, service, status, final_observations').eq('pet_id', pet.id).neq('id', appointment.id).order('appointment_date', { ascending: false });
    if (error) console.error("Error cargando historial completo de la mascota:", error);
    let lastAppointmentNotes = 'No hay observaciones de citas anteriores.';
    if (petHistory && petHistory.length > 0) {
        lastAppointmentNotes = petHistory[0].final_observations || 'La cita anterior no tuvo observaciones.';
    }
    modalDetailsContent.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm"><h4 class="font-bold text-lg mb-2">Cita Actual</h4><div class="flex items-center gap-4"><img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=A4D0A4&color=FFFFFF`}" class="h-16 w-16 rounded-full object-cover"><div><p><strong>Hora:</strong> ${appointment.appointment_time.slice(0, 5)}</p><p><strong>Mascota:</strong> ${pet.name}</p><p><strong>Servicio:</strong> ${appointment.service}</p></div></div></div>
        <div class="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-lg shadow-sm"><h4 class="font-semibold text-sm text-blue-800 mb-1">Observaciones de la Última Cita</h4><p class="text-sm text-gray-700">${lastAppointmentNotes}</p></div>
        <div class="bg-white p-4 rounded-lg shadow-sm"><h4 class="font-bold text-lg mb-2">Información de la Mascota</h4><div class="grid grid-cols-2 gap-2 text-sm"><p><strong>Raza:</strong> ${pet.breed}</p><p><strong>Sexo:</strong> ${pet.sex || 'N/A'}</p><p><strong>Edad:</strong> ${calculateAge(pet.birth_date)}</p><p><strong>Peso:</strong> ${pet.weight ? pet.weight + ' kg' : 'N/A'}</p></div><div class="bg-yellow-50 p-2 rounded-md mt-2"><p class="text-xs font-semibold">Observaciones Generales:</p><p class="text-xs">${pet.observations || 'Sin observaciones.'}</p></div></div>
        <div class="bg-white p-4 rounded-lg shadow-sm"><h4 class="font-bold text-lg mb-2">Historial Completo</h4><div class="space-y-2 max-h-40 overflow-y-auto">${petHistory && petHistory.length > 0 ? petHistory.map(hist => `<div class="bg-gray-50 p-2 rounded-md text-sm flex justify-between items-center"><p><strong>${hist.appointment_date}:</strong> ${hist.service}</p><span class="text-xs font-semibold px-2 py-0.5 rounded-full ${hist.status === 'completada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${hist.status}</span></div>`).join('') : '<p class="text-sm text-gray-500">No hay historial de citas anteriores.</p>'}</div></div>`;
    modalDailyView.classList.add('hidden');
    modalDetailsView.classList.remove('hidden');
};


// ====== INICIO DE LA MODIFICACIÓN: Funciones para nuevos modales ======
const setupClientAndPetModals = () => {
    // --- Lógica para modal de agregar cliente ---
    const openAddClientModal = () => {
        clientFormEmployee.reset();
        clientFormMessageEmployee.classList.add('hidden');
        clientModalEmployee.classList.remove('hidden');
    };
    const closeAddClientModal = () => clientModalEmployee.classList.add('hidden');

    addClientBtnEmployee.addEventListener('click', openAddClientModal);
    closeClientModalButtonEmployee.addEventListener('click', closeAddClientModal);
    cancelClientButtonEmployee.addEventListener('click', closeAddClientModal);

    clientFormEmployee.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(clientFormEmployee);
        const clientData = {
            firstName: formData.get('first_name'),
            lastName: formData.get('last_name'),
            phone: formData.get('phone'),
            district: formData.get('district'),
            // --- Nuevos campos opcionales ---
            docType: formData.get('doc_type') || null,
            docNum: formData.get('doc_num') || null
        };

        if (!clientData.firstName || !clientData.lastName || !clientData.phone) {
            alert('Nombre, apellido y teléfono son obligatorios.');
            return;
        }

        const { success, error, message } = await registerClientFromDashboard(clientData);

        if (success) {
            alert(message);
            closeAddClientModal();
            await loadInitialData(); // Recargar todos los datos
        } else {
            alert(`Error al registrar cliente: ${error.message}`);
        }
    });

    // --- Lógica para modal de agregar mascota ---
    const openAddPetModal = (ownerId) => {
        addPetFormEmployee.reset();
        addPetFormMessageEmployee.classList.add('hidden');
        petOwnerIdInputEmployee.value = ownerId;
        addPetModalEmployee.classList.remove('hidden');
    };
    const closeAddPetModal = () => addPetModalEmployee.classList.add('hidden');

    addPetToClientBtn.addEventListener('click', () => {
        if (currentClientId) {
            openAddPetModal(currentClientId);
        }
    });
    closeAddPetModalButtonEmployee.addEventListener('click', closeAddPetModal);
    cancelAddPetButtonEmployee.addEventListener('click', closeAddPetModal);

    addPetFormEmployee.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addPetFormEmployee);
        const petData = {
            owner_id: formData.get('owner_id'),
            name: formData.get('name'),
            breed: formData.get('breed'),
            observations: formData.get('observations'),
            species: 'Perro' // Por defecto
        };

        if (!petData.name || !petData.breed) {
            alert('Nombre y raza son obligatorios.');
            return;
        }

        const { success, error } = await addPetFromDashboard(petData);
        if (success) {
            alert('Mascota agregada exitosamente.');
            closeAddPetModal();
            // Recargar datos y refrescar la vista de detalles del cliente
            await loadInitialData();
            showClientDetails(petData.owner_id);
        } else {
            alert(`Error al agregar mascota: ${error.message}`);
        }
    });
};
// ====== FIN DE LA MODIFICACIÓN ======


// --- CARGA INICIAL DE DATOS ---
const loadInitialData = async () => {
    const [clientsRes, petsRes, appointmentsRes, productsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cliente'),
        supabase.from('pets').select('*, profiles(*)'),
        supabase.from('appointments').select('*, pets(*), profiles(*)'),
        getProducts()
    ]);
    allClients = clientsRes.data || [];
    allPets = petsRes.data || [];
    allAppointments = appointmentsRes.data || [];
    allProducts = productsRes || [];

    renderClients(allClients);
    renderPets(allPets);
    renderConfirmedAppointments();
    await renderCalendar();
    
    renderProductsEmployee(allProducts);
};

// --- INICIALIZACIÓN Y EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    logoutButton.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/public/modules/login/login.html'; });
    clientSearch.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); renderClients(allClients.filter(c => `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(term))); });
    clientsList.addEventListener('click', (e) => { const btn = e.target.closest('.client-btn'); if (btn) showClientDetails(btn.dataset.clientId); });
    backToClientsBtn.addEventListener('click', showClientsListView);
    petSearch.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); renderPets(allPets.filter(p => p.name.toLowerCase().includes(term) || `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.toLowerCase().includes(term))); });
    petsList.addEventListener('click', (e) => { const btn = e.target.closest('.pet-btn'); if (btn) showPetDetails(btn.dataset.petId); });
    backToPetsBtn.addEventListener('click', showPetsListView);
    prevMonthBtn.addEventListener('click', async () => { currentDate.setMonth(currentDate.getMonth() - 1); await renderCalendar(); });
    nextMonthBtn.addEventListener('click', async () => { currentDate.setMonth(currentDate.getMonth() + 1); await renderCalendar(); });
    calendarGrid.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.day-cell');
        if (dayCell && dayCell.dataset.hasAppointments === 'true') {
            renderAppointmentsInModal(dayCell.dataset.date);
            modalDailyView.classList.remove('hidden');
            modalDetailsView.classList.add('hidden');
            openModal();
        }
    });
    calendarModal.addEventListener('click', (e) => { if (e.target === calendarModal) closeModal(); });
    modalAppointmentsList.addEventListener('click', (e) => { const btn = e.target.closest('.appointment-btn'); if (btn) showAppointmentDetails(btn.dataset.appointmentId); });
    modalBackBtn.addEventListener('click', () => { modalDetailsView.classList.add('hidden'); modalDailyView.classList.remove('hidden'); });
    
    appointmentsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.complete-btn');
        if (btn) {
            openCompletionModal(btn.dataset.appointmentId);
        }
    });

    setupCompletionModalListeners();
    initializeAddAppointmentModal();
    initializePOSEmployee();
    
    setupClientAndPetModals();

    showView('clients');
    loadInitialData();
});