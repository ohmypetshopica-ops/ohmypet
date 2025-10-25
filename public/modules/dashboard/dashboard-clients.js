// public/modules/dashboard/dashboard-clients.js

import { getClients, searchClients, getClientDetails, registerClientFromDashboard, addPetFromDashboard, updateClientProfile } from './dashboard.api.js';
import { supabase } from '../../core/supabase.js'; // Necesario para subir imágenes

// --- INICIO DE LA CORRECCIÓN: Bandera de inicialización ---
// Esta bandera previene que los event listeners se registren múltiples veces si el script se carga más de una vez.
let isInitialized = false;
// --- FIN DE LA CORRECCIÓN ---

// ====== VARIABLES DE PAGINACIÓN AGREGADAS ======
let currentPage = 1;
const itemsPerPage = 8; // Número de clientes por página
let allClientsData = []; // Almacena todos los clientes
// ====== FIN VARIABLES DE PAGINACIÓN ======

// ====== FUNCIÓN createClientRow DEFINIDA LOCALMENTE ======
const createClientRow = (client) => {
    const displayName = (client.first_name && client.last_name) 
        ? `${client.first_name} ${client.last_name}` 
        : client.full_name || 'Sin nombre';
    const avatarUrl = client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=A4D0A4&color=FFFFFF`;
    const phone = client.phone || 'Sin teléfono';
    const petsCount = client.pets_count || 0;
    
    let lastAppointmentText = 'Sin citas';
    if (client.last_appointment_date) {
        const date = new Date(client.last_appointment_date);
        lastAppointmentText = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    return `
        <tr class="hover:bg-gray-50 cursor-pointer" data-client-id="${client.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img src="${avatarUrl}" alt="Avatar" class="h-10 w-10 rounded-full object-cover">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${displayName}</div>
                        <div class="text-sm text-gray-500">${phone}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                ${petsCount} ${petsCount === 1 ? 'mascota' : 'mascotas'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${lastAppointmentText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button class="text-indigo-600 hover:text-indigo-900 view-details-btn" data-client-id="${client.id}">Ver Detalles</button>
            </td>
        </tr>
    `;
};
// ====== FIN FUNCIÓN createClientRow ======

// --- UTILITY: LIMPIEZA DE NÚMEROS DE TELÉFONO ---
const cleanPhoneNumber = (rawNumber) => {
    if (!rawNumber) return null;
    
    // 1. Eliminar todos los caracteres que no son dígitos, excepto el signo '+'
    let cleaned = rawNumber.replace(/[^\d+]/g, '');
    
    // 2. Si el número no tiene 9 dígitos exactos y no comienza con '+', se considera inválido por ahora.
    //    Si comienza con '+', se almacena el número completo (código de país).
    if (cleaned.length < 9 || (cleaned.length > 9 && !cleaned.startsWith('+'))) {
        // En este caso, si no tiene 9 dígitos exactos, y no tiene un '+' inicial (que indica código de país),
        // lo forzamos a ser 9 dígitos si es posible, si no, se devuelve como inválido.
        let digitsOnly = cleaned.replace(/\D/g, '');
        if (digitsOnly.length === 9) {
            return digitsOnly; // 9 dígitos locales
        }
        if (digitsOnly.length > 9) {
            return digitsOnly.slice(-9); // Forzar 9 dígitos locales si es más largo
        }
        return null; // Inválido
    }
    
    // 3. Si tiene un '+' o tiene 9 dígitos exactos, se devuelve limpio (ej: +51987654321 o 987654321)
    return cleaned;
};
// --- FIN UTILITY ---


// --- ELEMENTOS DEL DOM ---
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input');
const headerTitle = document.querySelector('#header-title');
const paginationContainer = document.querySelector('#pagination-container'); // ====== ELEMENTO AGREGADO ======

// --- ELEMENTOS DEL MODAL DE DETALLES ---
const clientDetailsModal = document.querySelector('#client-details-modal');
const modalCloseBtn = document.querySelector('#modal-close-btn');
const modalClientName = document.querySelector('#modal-client-name');
const modalContentView = document.querySelector('#modal-content-body-view'); // Contenedor de la vista
const modalContentEdit = document.querySelector('#client-edit-mode'); // Contenedor del modo edición
const clientEditForm = document.querySelector('#client-edit-form'); // Formulario de edición
const editFormMessage = document.querySelector('#edit-form-message'); // Mensaje de error/éxito en edición

let currentClientId = null; // Variable para guardar el ID del cliente que se está viendo
let currentClientProfile = null; // Variable para guardar los datos originales del cliente

// --- ELEMENTOS DE EDICIÓN Y FOOTER ---
const editClientBtn = document.querySelector('#edit-client-btn');
const saveClientBtn = document.querySelector('#save-client-btn');
const cancelEditClientBtn = document.querySelector('#cancel-edit-client-btn');
const modalAddPetBtnFooter = document.querySelector('#modal-add-pet-btn-footer'); // Botón de agregar mascota en el footer


// --- ELEMENTOS DEL MODAL DE REGISTRO DE CLIENTE---
const addClientButton = document.querySelector('#add-client-button');
const clientModal = document.querySelector('#client-modal');
const closeClientModalButton = document.querySelector('#close-client-modal-button');
const cancelClientButton = document.querySelector('#cancel-client-button');
const clientForm = document.querySelector('#client-form');
const clientFormMessage = document.querySelector('#client-form-message');

// --- ELEMENTOS DEL MODAL DE AGREGAR MASCOTA ---
const addPetModal = document.querySelector('#add-pet-modal');
const closeAddPetModalButton = document.querySelector('#close-add-pet-modal-button');
const cancelAddPetButton = document.querySelector('#cancel-add-pet-button');
const addPetForm = document.querySelector('#add-pet-form');
const addPetFormMessage = document.querySelector('#add-pet-form-message');
const petOwnerIdInput = document.querySelector('#pet-owner-id');
const petPhotoInput = document.querySelector('#pet-photo');
const petImagePreview = document.querySelector('#pet-image-preview');
let photoFile = null; // Variable para almacenar el archivo de la foto

// ====== FUNCIÓN DE RENDERIZADO DE PAGINACIÓN AGREGADA ======
const renderPagination = (totalItems) => {
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex justify-center items-center gap-2 mt-6">';
    
    // Botón Anterior (solo si no estamos en la primera página)
    if (currentPage > 1) {
        paginationHTML += `
            <button data-page="${currentPage - 1}" 
                    class="px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 font-medium text-sm">
                Anterior
            </button>
        `;
    }

    // Números de página (mostrar máximo 3 números)
    const maxVisible = 3;
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button data-page="${i}" 
                    class="w-10 h-10 rounded-lg font-medium text-sm ${i === currentPage ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}">
                ${i}
            </button>
        `;
    }

    // Botón Siguiente (solo si no estamos en la última página)
    if (currentPage < totalPages) {
        paginationHTML += `
            <button data-page="${currentPage + 1}" 
                    class="px-4 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 font-medium text-sm">
                Siguiente
            </button>
        `;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    // Agregar listeners a los botones de paginación
    paginationContainer.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const newPage = parseInt(button.dataset.page);
            if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
                currentPage = newPage;
                renderClientsTable(allClientsData);
            }
        });
    });
};
// ====== FIN FUNCIÓN DE PAGINACIÓN ======

// ====== RENDERIZADO DE DATOS MODIFICADO PARA PAGINACIÓN ======
const renderClientsTable = (clients) => {
    if (!clientsTableBody) return;
    
    allClientsData = clients; // Guardar todos los clientes
    
    // Calcular índices para la paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = clients.slice(startIndex, endIndex);
    
    clientsTableBody.innerHTML = paginatedClients.length > 0 
        ? paginatedClients.map(createClientRow).join('') 
        : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
    
    // Renderizar controles de paginación
    renderPagination(clients.length);
};
// ====== FIN RENDERIZADO MODIFICADO ======

// --- LÓGICA DEL MODAL DE DETALLES Y EDICIÓN ---
const openModal = () => clientDetailsModal.classList.remove('hidden');
const closeModal = () => {
    clientDetailsModal.classList.add('hidden');
    currentClientId = null;
    currentClientProfile = null;
    switchToViewMode(); // Asegurar que volvemos al modo de vista
};

const renderEditForm = (profile) => {
    // Limpiar mensajes de error previos
    editFormMessage.classList.add('hidden');

    // Rellenar los campos del formulario de edición con los datos del perfil
    document.querySelector('#edit-client-id').value = profile.id;
    document.querySelector('#edit-first-name').value = profile.first_name || '';
    document.querySelector('#edit-last-name').value = profile.last_name || '';
    document.querySelector('#edit-email').value = profile.email || 'N/A';
    // Se muestra el número original, el limpiado es solo para guardar
    document.querySelector('#edit-phone').value = profile.phone || ''; 
    document.querySelector('#edit-district').value = profile.district || '';
    document.querySelector('#edit-doc-type').value = profile.doc_type || '';
    document.querySelector('#edit-doc-num').value = profile.doc_num || '';
    document.querySelector('#edit-emergency-name').value = profile.emergency_contact_name || '';
    document.querySelector('#edit-emergency-phone').value = profile.emergency_contact_phone || '';
};

const switchToEditMode = () => {
    if (!currentClientProfile) return;
    
    // Ocultar modo vista y mostrar modo edición
    modalContentView.classList.add('hidden');
    modalContentEdit.classList.remove('hidden');

    // Ocultar botones de vista y mostrar botones de edición
    editClientBtn.classList.add('hidden');
    saveClientBtn.classList.remove('hidden');
    cancelEditClientBtn.classList.remove('hidden');
    modalAddPetBtnFooter.classList.add('hidden');
    
    // Renderizar el formulario de edición con los datos actuales
    renderEditForm(currentClientProfile.profile);
};

const switchToViewMode = () => {
    // Ocultar modo edición y mostrar modo vista
    modalContentEdit.classList.add('hidden');
    modalContentView.classList.remove('hidden');

    // Ocultar botones de edición y mostrar botones de vista
    editClientBtn.classList.remove('hidden');
    saveClientBtn.classList.add('hidden');
    cancelEditClientBtn.classList.add('hidden');
    modalAddPetBtnFooter.classList.remove('hidden');
    
    // Volver a renderizar la vista (por si se recargaron los datos)
    if (currentClientProfile) {
        populateModal(currentClientProfile);
    } else {
        modalContentView.innerHTML = '<div class="text-center py-10 text-gray-500">Cargando...</div>';
    }
};

const handleSaveClient = async () => {
    const form = document.querySelector('#client-edit-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const clientId = formData.get('id');
    
    const phoneRaw = formData.get('phone');
    const emergencyPhoneRaw = formData.get('emergency_contact_phone');
    
    // Limpiar números de teléfono para la validación y el guardado
    const phoneCleaned = cleanPhoneNumber(phoneRaw);
    const emergencyPhoneCleaned = cleanPhoneNumber(emergencyPhoneRaw);

    const updatedData = {
        first_name: formData.get('first_name').trim(),
        last_name: formData.get('last_name').trim(),
        full_name: `${formData.get('first_name').trim()} ${formData.get('last_name').trim()}`,
        phone: phoneCleaned,
        doc_type: formData.get('doc_type') || null,
        doc_num: formData.get('doc_num').trim() || null,
        district: formData.get('district').trim() || null,
        emergency_contact_name: formData.get('emergency_contact_name').trim() || null,
        emergency_contact_phone: emergencyPhoneCleaned,
    };
    
    // Validación de campos requeridos (Nombre y Apellido)
    if (!updatedData.first_name || !updatedData.last_name) {
        editFormMessage.textContent = '⚠️ Los campos Nombre y Apellido son obligatorios.';
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
        return;
    }

    if (!updatedData.phone || updatedData.phone.length < 9) {
        editFormMessage.textContent = '⚠️ El número de teléfono debe tener al menos 9 dígitos.';
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
        return;
    }

    saveClientBtn.disabled = true;
    saveClientBtn.textContent = 'Guardando...';
    editFormMessage.textContent = '⏳ Guardando cambios...';
    editFormMessage.className = 'block p-3 rounded-md bg-blue-100 text-blue-700 text-sm mb-4';
    editFormMessage.classList.remove('hidden');

    const result = await updateClientProfile(clientId, updatedData);

    if (result.success) {
        editFormMessage.textContent = '✅ Cliente actualizado exitosamente.';
        editFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
        
        // Recargar los detalles del cliente
        const updatedDetails = await getClientDetails(clientId);
        if (updatedDetails) {
            currentClientProfile = updatedDetails;
            editFormMessage.textContent = '✅ Cliente actualizado exitosamente.';
            editFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
            editFormMessage.classList.remove('hidden');
            
            // Volver al modo de vista después de un breve retraso
            setTimeout(() => {
                switchToViewMode();
                initializeClientsSection(); // Recargar tabla principal para actualizar el nombre
            }, 1000);
        } else {
            editFormMessage.textContent = '⚠️ Cliente actualizado, pero hubo un error al recargar los detalles.';
            editFormMessage.className = 'block p-3 rounded-md bg-yellow-100 text-yellow-700 text-sm mb-4';
            editFormMessage.classList.remove('hidden');
        }
    } else {
        editFormMessage.textContent = `❌ Error al guardar: ${result.error?.message || 'Error desconocido'}`;
        editFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
        editFormMessage.classList.remove('hidden');
    }
    
    saveClientBtn.disabled = false;
    saveClientBtn.textContent = 'Guardar Cambios';
};


const populateModal = (details) => {
    currentClientProfile = details; // Guardar detalles en caché
    const { profile, pets, appointments } = details;

    // ================== INICIO DE LA CORRECCIÓN ==================
    // Filtramos las mascotas para asegurarnos de que no haya duplicados por ID
    // Esto previene que se muestren mascotas duplicadas si hay un error en los datos.
    const uniquePets = pets.filter((pet, index, self) =>
        index === self.findIndex((p) => p.id === pet.id)
    );
    // =================== FIN DE LA CORRECCIÓN ====================

    const displayName = (profile.first_name && profile.last_name) 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.full_name;
    
    modalClientName.textContent = displayName;

    modalContentView.innerHTML = `
        <div id="client-view-data" class="space-y-6">
            <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Información de Contacto</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <p><strong>Email:</strong> <a href="mailto:${profile.email || ''}" class="text-blue-600 hover:underline">${profile.email || 'N/A'}</a></p>
                    <p><strong>Teléfono:</strong> <a href="https://wa.me/51${profile.phone || ''}" target="_blank" class="text-blue-600 hover:underline">${profile.phone || 'N/A'}</a></p>
                    <p><strong>Tipo de Doc.:</strong> ${profile.doc_type || 'N/A'}</p>
                    <p><strong>Nro. Doc.:</strong> ${profile.doc_num || 'N/A'}</p>
                    <p><strong>Distrito:</strong> ${profile.district || 'N/A'}</p>
                    <p><strong>Contacto de Emergencia:</strong> ${profile.emergency_contact_name || 'N/A'} - ${profile.emergency_contact_phone || 'N/A'}</p>
                </div>
            </div>

            <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Mascotas (${uniquePets.length})</h3>
                ${uniquePets.length > 0 ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${uniquePets.map(pet => `
                            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start space-x-4">
                                ${pet.image_url 
                                    ? `<img src="${pet.image_url}" alt="${pet.name}" class="h-16 w-16 rounded-full object-cover flex-shrink-0">` 
                                    : `<div class="h-16 w-16 bg-gradient-to-br from-green-300 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                         <span class="text-white font-bold text-xl">${pet.name.charAt(0).toUpperCase()}</span>
                                       </div>`
                                }
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-semibold text-gray-800 truncate">${pet.name}</h4>
                                    <p class="text-sm text-gray-600">${pet.breed || 'Raza no especificada'} - ${pet.sex || 'N/A'}</p>
                                    <p class="text-sm text-gray-500">${pet.birth_date ? new Date(pet.birth_date + 'T00:00:00').toLocaleDateString('es-ES') : 'Edad no especificada'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-sm text-gray-500">No tiene mascotas registradas.</p>'}
            </div>

            <div>
                <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Citas Registradas</h3>
                ${appointments.length > 0 ? `
                    <div class="space-y-3">
                        ${appointments.slice(0, 5).map(apt => `
                            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-semibold text-gray-800">${new Date(apt.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <p class="text-sm text-gray-600">${apt.service || 'Servicio no especificado'} - ${apt.appointment_time}</p>
                                    </div>
                                    <span class="text-xs px-2 py-1 rounded-full ${
                                        apt.status === 'completada' ? 'bg-green-100 text-green-800' : 
                                        apt.status === 'confirmada' ? 'bg-blue-100 text-blue-800' : 
                                        'bg-yellow-100 text-yellow-800'
                                    }">${apt.status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-sm text-gray-500">No tiene citas registradas.</p>'}
            </div>
        </div>
    `;
};

// --- LÓGICA DEL MODAL DE REGISTRO DE CLIENTE ---
const openClientModal = () => clientModal.classList.remove('hidden');
const closeClientModal = () => {
    clientModal.classList.add('hidden');
    clientForm.reset();
};

const setupClientModal = () => {
    if (!clientDetailsModal) return;

    modalCloseBtn.addEventListener('click', closeModal);
    clientDetailsModal.addEventListener('click', (e) => {
        if (e.target === clientDetailsModal) closeModal();
    });
    
    // Listener para el botón de editar
    editClientBtn.addEventListener('click', switchToEditMode);
    
    // Listener para el botón de guardar cambios
    saveClientBtn.addEventListener('click', handleSaveClient);
    
    // Listener para el botón de cancelar edición
    cancelEditClientBtn.addEventListener('click', switchToViewMode);
    
    // Listener para abrir el modal de agregar mascota desde el modal de detalles
    modalAddPetBtnFooter.addEventListener('click', () => {
        if (currentClientId) openAddPetModal(currentClientId);
    });

    addClientButton.addEventListener('click', openClientModal);
    closeClientModalButton.addEventListener('click', closeClientModal);
    cancelClientButton.addEventListener('click', closeClientModal);
    clientModal.addEventListener('click', (e) => {
        if (e.target === clientModal) closeClientModal();
    });

    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = clientForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        const formData = new FormData(clientForm);
        
        const phoneRaw = formData.get('phone');
        const emergencyPhoneRaw = formData.get('emergency_contact_phone');
        
        // Limpiar números de teléfono
        const phoneCleaned = cleanPhoneNumber(phoneRaw);
        const emergencyPhoneCleaned = cleanPhoneNumber(emergencyPhoneRaw);

        const clientData = {
            firstName: formData.get('first_name').trim(),
            lastName: formData.get('last_name').trim(),
            email: formData.get('email').trim() || null,
            password: formData.get('password') || null,
            phone: phoneCleaned,
            district: formData.get('district').trim() || null,
            docType: formData.get('doc_type'),
            docNum: formData.get('doc_num').trim() || null,
            emergencyContactName: formData.get('emergency_contact_name').trim() || null,
            emergencyContactPhone: emergencyPhoneCleaned,
        };

        if (!clientData.firstName || !clientData.lastName || !clientData.phone) {
            if(clientFormMessage) {
                clientFormMessage.textContent = 'Los campos Nombre, Apellido y Teléfono son obligatorios.';
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Cliente';
            return;
        }

        if (clientData.email && !clientData.password) {
            if(clientFormMessage) {
                clientFormMessage.textContent = 'Si proporcionas un email, la contraseña es obligatoria.';
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Cliente';
            return;
        }

        const { success, error } = await registerClientFromDashboard(clientData);

        if (success) {
            if(clientFormMessage) {
                clientFormMessage.textContent = '¡Cliente registrado con éxito!';
                clientFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            setTimeout(async () => {
                closeClientModal();
                const updatedClients = await getClients();
                currentPage = 1; // ====== RESETEAR PÁGINA AL REGISTRAR ======
                renderClientsTable(updatedClients);
            }, 1500);
        } else {
            if(clientFormMessage) {
                clientFormMessage.textContent = `Error: ${error.message}`;
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
        }

        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Cliente';
    });
};

// --- LÓGICA DEL MODAL DE AGREGAR MASCOTA ---
const openAddPetModal = (clientId) => {
    currentClientId = clientId;
    petOwnerIdInput.value = clientId; // Rellenar el campo oculto con el ID del dueño
    addPetFormMessage.classList.add('hidden'); // Limpiar mensajes previos
    addPetForm.reset(); // Resetea el formulario
    petImagePreview.classList.add('hidden'); // Oculta la imagen de vista previa
    petImagePreview.src = 'https://via.placeholder.com/100'; // Resetea la imagen
    photoFile = null; // Limpia el archivo
    addPetModal.classList.remove('hidden');
    // Cerrar el modal de detalles del cliente para que no se superponga
    clientDetailsModal.classList.add('hidden');
};

const closeAddPetModal = () => {
    addPetModal.classList.add('hidden');
    addPetForm.reset();
    // Reabrir el modal de detalles del cliente
    clientDetailsModal.classList.remove('hidden');
    // Recargar el contenido del modal de detalles para actualizar la lista de mascotas
    if (currentClientId) {
        modalContentView.innerHTML = '<div class="text-center py-10 text-gray-500">Actualizando...</div>';
        getClientDetails(currentClientId).then(updatedDetails => {
            if (updatedDetails) {
                populateModal(updatedDetails);
            }
        });
    }
};

const setupAddPetModal = () => {
    if (!addPetModal) return;

    closeAddPetModalButton.addEventListener('click', closeAddPetModal);
    cancelAddPetButton.addEventListener('click', closeAddPetModal);
    addPetModal.addEventListener('click', (e) => {
        if (e.target === addPetModal) closeAddPetModal();
    });
    
    // Listener para la vista previa de la imagen
    petPhotoInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            photoFile = file;
            petImagePreview.classList.remove('hidden');
            const reader = new FileReader();
            reader.onload = (e) => {
                petImagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    addPetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = addPetForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        const formData = new FormData(addPetForm);
        
        let imageUrl = null;
        
        // Lógica para subir la foto a Supabase Storage
        if (photoFile) {
            const fileName = `public/${currentClientId || 'unknown'}/${Date.now()}_${photoFile.name}`;
            const { data, error: uploadError } = await supabase.storage
                .from('pet_galleries') // Asegúrate que tu bucket se llame 'pet_galleries'
                .upload(fileName, photoFile);

            if (uploadError) {
                alert('Error al subir la imagen: ' + uploadError.message);
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Mascota';
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('pet_galleries')
                .getPublicUrl(fileName);
            imageUrl = publicUrl;
        }
        
        const petData = {
            owner_id: formData.get('owner_id'),
            name: formData.get('name'),
            breed: formData.get('breed'),
            sex: formData.get('sex'),
            observations: formData.get('observations'),
            birth_date: formData.get('birth_date') || null,
            weight: parseFloat(formData.get('weight')) || null,
            image_url: imageUrl,
            species: 'Perro'
        };

        if (!petData.name || !petData.breed) {
            alert('El nombre y la raza son obligatorios.');
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Mascota';
            return;
        }

        const { success, error } = await addPetFromDashboard(petData);

        if (success) {
            alert('¡Mascota registrada con éxito!');
            closeAddPetModal();
        } else {
            if(addPetFormMessage) {
                addPetFormMessage.textContent = `Error: ${error.message}`;
                addPetFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                addPetFormMessage.classList.remove('hidden');
            }
        }

        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Mascota';
    });
};

// --- LÓGICA DE BÚSQUEDA Y EVENTOS ---
const setupEventListeners = () => {
    if (!clientSearchInput) return;
    
    let debounceTimer;
    clientSearchInput.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const searchTerm = event.target.value.trim();
            currentPage = 1; // ====== RESETEAR PÁGINA AL BUSCAR ======
            clientsTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">Buscando...</td></tr>`;
            const clients = searchTerm ? await searchClients(searchTerm) : await getClients();
            renderClientsTable(clients);
        }, 300);
    });

    clientsTableBody.addEventListener('click', async (event) => {
        const viewButton = event.target.closest('.view-details-btn');
        if (viewButton) {
            const clientId = viewButton.dataset.clientId;
            if (!clientId) return;

            currentClientId = clientId;
            openModal();
            modalContentView.innerHTML = '<div class="text-center py-10 text-gray-500">Cargando...</div>';
            
            const clientDetails = await getClientDetails(clientId);
            
            if (clientDetails) {
                populateModal(clientDetails);
            } else {
                modalContentView.innerHTML = '<div class="text-center py-10 text-red-500">Error al cargar los detalles del cliente.</div>';
            }
        }
    });

    modalCloseBtn?.addEventListener('click', closeModal);
    clientDetailsModal?.addEventListener('click', (event) => {
        if (event.target === clientDetailsModal) {
            closeModal();
        }
    });
    
    // --- NUEVOS LISTENERS DE EDICIÓN ---
    editClientBtn.addEventListener('click', switchToEditMode);
    saveClientBtn.addEventListener('click', handleSaveClient); // El handler se encarga de todo
    cancelEditClientBtn.addEventListener('click', switchToViewMode); 
    modalAddPetBtnFooter.addEventListener('click', () => { // Listener para el botón del footer
        if (currentClientId) openAddPetModal(currentClientId);
    });
    // --- FIN NUEVOS LISTENERS ---
};

// --- INICIALIZACIÓN DE LA SECCIÓN ---
const initializeClientsSection = async () => {
    // --- INICIO DE LA CORRECCIÓN: Prevenir reinicialización ---
    if (isInitialized) return;
    isInitialized = true;
    // --- FIN DE LA CORRECCIÓN ---

    if (headerTitle) {
        headerTitle.textContent = 'Gestión de Clientes';
    }
    
    currentPage = 1; // ====== RESETEAR PÁGINA AL INICIALIZAR ======
    const initialClients = await getClients();
    renderClientsTable(initialClients);
    setupEventListeners();
    setupClientModal();
    setupAddPetModal();
};

document.addEventListener('DOMContentLoaded', initializeClientsSection);