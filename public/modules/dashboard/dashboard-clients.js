// public/modules/dashboard/dashboard-clients.js

import { getClients, searchClients, getClientDetails, registerClientFromDashboard, addPetFromDashboard } from './dashboard.api.js';
import { createClientRow } from './dashboard.utils.js';
import { supabase } from '../../core/supabase.js'; // Necesario para subir imágenes

// --- ELEMENTOS DEL DOM ---
const clientsTableBody = document.querySelector('#clients-table-body');
const clientSearchInput = document.querySelector('#client-search-input');
const headerTitle = document.querySelector('#header-title');

// --- ELEMENTOS DEL MODAL DE DETALLES ---
const clientDetailsModal = document.querySelector('#client-details-modal');
const modalCloseBtn = document.querySelector('#modal-close-btn');
const modalClientName = document.querySelector('#modal-client-name');
const modalContentBody = document.querySelector('#modal-content-body');
let currentClientId = null; // Variable para guardar el ID del cliente que se está viendo

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
// ===== INICIO NUEVOS ELEMENTOS =====
const petPhotoInput = document.querySelector('#pet-photo');
const petImagePreview = document.querySelector('#pet-image-preview');
let photoFile = null; // Variable para almacenar el archivo de la foto
// ===== FIN NUEVOS ELEMENTOS =====


// --- RENDERIZADO DE DATOS ---
const renderClientsTable = (clients) => {
    if (!clientsTableBody) return;
    clientsTableBody.innerHTML = clients.length > 0 
        ? clients.map(createClientRow).join('') 
        : `<tr><td colspan="3" class="text-center py-4 text-gray-500">No hay clientes registrados.</td></tr>`;
};

// --- LÓGICA DEL MODAL DE DETALLES ---
const openModal = () => clientDetailsModal.classList.remove('hidden');
const closeModal = () => {
    clientDetailsModal.classList.add('hidden');
    currentClientId = null; // Limpiar el ID al cerrar
};

const populateModal = (details) => {
    const { profile, pets, appointments } = details;

    const displayName = (profile.first_name && profile.last_name) 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.full_name;
    
    modalClientName.textContent = displayName;

    modalContentBody.innerHTML = `
        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Información de Contacto</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <p><strong>Email:</strong> <a href="mailto:${profile.email || ''}" class="text-blue-600 hover:underline">${profile.email || 'N/A'}</a></p>
                <p><strong>Teléfono:</strong> <a href="https://wa.me/51${profile.phone || ''}" target="_blank" class="text-blue-600 hover:underline">${profile.phone || 'N/A'}</a></p>
                <p><strong>Tipo de Doc.:</strong> ${profile.doc_type || 'N/A'}</p>
                <p><strong>Nro. Doc.:</strong> ${profile.doc_num || 'N/A'}</p>
                <p><strong>Distrito:</strong> ${profile.district || 'N/A'}</p>
                <p><strong>Contacto Emergencia:</strong> ${profile.emergency_contact_name || 'N/A'} (${profile.emergency_contact_phone || 'N/A'})</p>
            </div>
        </div>

        <div>
            <div class="flex justify-between items-center mb-3 border-b pb-2">
                <h3 class="text-lg font-semibold text-gray-800">Mascotas Registradas (${pets.length})</h3>
                <button id="add-pet-for-client-btn" class="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 px-3 rounded-full transition-colors">+ Agregar Mascota</button>
            </div>
            <div class="space-y-3">
                ${pets.length > 0 ? pets.map(pet => `
                    <div class="bg-gray-50 p-3 rounded-lg flex items-center gap-4 border border-gray-200">
                        <img src="${pet.image_url || 'https://via.placeholder.com/40'}" alt="${pet.name}" class="h-12 w-12 rounded-full object-cover">
                        <div>
                            <p class="font-semibold text-gray-900">${pet.name}</p>
                            <p class="text-xs text-gray-600">${pet.breed || 'Raza no especificada'} | ${pet.sex || 'N/A'}</p>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No tiene mascotas registradas.</p>'}
            </div>
        </div>

        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Historial de Citas (${appointments.length})</h3>
            <div class="space-y-2 max-h-48 overflow-y-auto">
                ${appointments.length > 0 ? appointments.map(app => `
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div class="flex justify-between items-center">
                            <p class="font-semibold text-sm">${app.appointment_date} - ${app.pets?.name || 'Mascota eliminada'}</p>
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                app.status === 'completada' ? 'bg-green-100 text-green-800' :
                                app.status === 'cancelada' || app.status === 'rechazada' ? 'bg-red-100 text-red-800' :
                                app.status === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                            }">${app.status}</span>
                        </div>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No tiene citas registradas.</p>'}
            </div>
        </div>
    `;

    // Añadir listener al nuevo botón para abrir el modal de agregar mascota
    document.querySelector('#add-pet-for-client-btn').addEventListener('click', () => {
        openAddPetModal(profile.id);
    });
};

const setupClientModal = () => {
    if (!addClientButton || !clientModal || !clientForm) return;

    const emailInput = clientForm.querySelector('input[name="email"]');
    const passwordField = document.getElementById('password-field');
    const passwordInput = clientForm.querySelector('input[name="password"]');

    if (emailInput && passwordField && passwordInput) {
        emailInput.addEventListener('input', () => {
            if (emailInput.value.trim()) {
                passwordField.classList.remove('hidden');
                passwordInput.required = true;
            } else {
                passwordField.classList.add('hidden');
                passwordInput.required = false;
                passwordInput.value = '';
            }
        });
    }

    const closeRegisterModal = () => {
        clientModal.classList.add('hidden');
        clientForm.reset();
        passwordField?.classList.add('hidden');
        if (passwordInput) passwordInput.required = false;
        clientFormMessage?.classList.add('hidden');
    };

    addClientButton.addEventListener('click', () => {
        clientModal.classList.remove('hidden');
        clientForm.reset();
        passwordField?.classList.add('hidden');
        if (passwordInput) passwordInput.required = false;
        clientFormMessage?.classList.add('hidden');
    });

    closeClientModalButton?.addEventListener('click', closeRegisterModal);
    cancelClientButton?.addEventListener('click', closeRegisterModal);
    
    clientModal.addEventListener('click', (e) => {
        if (e.target === clientModal) closeRegisterModal();
    });

    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (clientFormMessage) clientFormMessage.classList.add('hidden');

        const formData = new FormData(clientForm);
        const email = formData.get('email')?.trim() || null;
        const password = formData.get('password')?.trim() || null;

        const clientData = {
            firstName: formData.get('first_name').trim(),
            lastName: formData.get('last_name').trim(),
            phone: formData.get('phone').trim(),
            district: formData.get('district').trim(),
            docType: formData.get('doc_type') || null,
            docNum: formData.get('doc_num')?.trim() || null,
            email: email,
            password: password,
            emergencyContactName: formData.get('emergency_contact_name')?.trim() || null,
            emergencyContactPhone: formData.get('emergency_contact_phone')?.trim() || null
        };

        if (!clientData.firstName || !clientData.lastName || !clientData.phone || !clientData.district) {
            if (clientFormMessage) {
                clientFormMessage.textContent = '⚠️ Por favor completa todos los campos obligatorios (marcados con *).';
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            return;
        }

        if (clientData.phone.length !== 9 || !/^\d+$/.test(clientData.phone)) {
            if (clientFormMessage) {
                clientFormMessage.textContent = '⚠️ El teléfono debe tener exactamente 9 dígitos numéricos.';
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            return;
        }

        if (clientData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(clientData.email)) {
                if (clientFormMessage) {
                    clientFormMessage.textContent = '⚠️ Por favor ingresa un email válido.';
                    clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                    clientFormMessage.classList.remove('hidden');
                }
                return;
            }

            if (!clientData.password || clientData.password.length < 6) {
                if (clientFormMessage) {
                    clientFormMessage.textContent = '⚠️ Si proporcionas email, la contraseña es obligatoria y debe tener mínimo 6 caracteres.';
                    clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                    clientFormMessage.classList.remove('hidden');
                }
                return;
            }
        }

        if (clientData.emergencyContactPhone && 
            (clientData.emergencyContactPhone.length !== 9 || !/^\d+$/.test(clientData.emergencyContactPhone))) {
            if (clientFormMessage) {
                clientFormMessage.textContent = '⚠️ El teléfono de emergencia debe tener 9 dígitos numéricos.';
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            return;
        }

        if (clientFormMessage) {
            clientFormMessage.textContent = '⏳ Registrando cliente...';
            clientFormMessage.className = 'block p-3 rounded-md bg-blue-100 text-blue-700 text-sm mb-4';
            clientFormMessage.classList.remove('hidden');
        }

        const submitBtn = clientForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        const result = await registerClientFromDashboard(clientData);

        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;

        if (result.success) {
            if (clientFormMessage) {
                const msg = clientData.email 
                    ? '✅ Cliente registrado con acceso a la plataforma.'
                    : '✅ Cliente registrado exitosamente (solo datos físicos).';
                clientFormMessage.textContent = msg;
                clientFormMessage.className = 'block p-3 rounded-md bg-green-100 text-green-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
            
            setTimeout(() => {
                closeRegisterModal();
                initializeClientsSection();
            }, 1500);
        } else {
            if (clientFormMessage) {
                let errorMsg = 'No se pudo registrar el cliente.';
                
                if (result.error?.message?.includes('already registered')) {
                    errorMsg = 'Ya existe un cliente con este correo electrónico.';
                } else if (result.error?.message?.includes('duplicate')) {
                    errorMsg = 'Ya existe un cliente con este documento.';
                } else if (result.error?.message) {
                    errorMsg = result.error.message;
                }
                
                clientFormMessage.textContent = `❌ Error: ${errorMsg}`;
                clientFormMessage.className = 'block p-3 rounded-md bg-red-100 text-red-700 text-sm mb-4';
                clientFormMessage.classList.remove('hidden');
            }
        }
    });
};

// --- LÓGICA DEL MODAL DE AGREGAR MASCOTA ---
const openAddPetModal = (ownerId) => {
    addPetForm.reset();
    if (addPetFormMessage) addPetFormMessage.classList.add('hidden');
    petOwnerIdInput.value = ownerId;
    // ===== INICIO CÓDIGO AÑADIDO =====
    petImagePreview.src = 'https://via.placeholder.com/100'; // Resetea la imagen
    photoFile = null; // Limpia el archivo
    // ===== FIN CÓDIGO AÑADIDO =====
    addPetModal.classList.remove('hidden');
};

const closeAddPetModal = () => {
    addPetModal.classList.add('hidden');
    addPetForm.reset();
};

const setupAddPetModal = () => {
    if (!addPetModal) return;

    closeAddPetModalButton.addEventListener('click', closeAddPetModal);
    cancelAddPetButton.addEventListener('click', closeAddPetModal);
    addPetModal.addEventListener('click', (e) => {
        if (e.target === addPetModal) closeAddPetModal();
    });
    
    // ===== INICIO CÓDIGO AÑADIDO =====
    // Listener para la vista previa de la imagen
    petPhotoInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            photoFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                petImagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    // ===== FIN CÓDIGO AÑADIDO =====

    addPetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = addPetForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';

        const formData = new FormData(addPetForm);
        
        let imageUrl = null;
        // ===== INICIO CÓDIGO AÑADIDO =====
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
        // ===== FIN CÓDIGO AÑADIDO =====
        
        const petData = {
            owner_id: formData.get('owner_id'),
            name: formData.get('name'),
            breed: formData.get('breed'),
            sex: formData.get('sex'),
            observations: formData.get('observations'),
            // ===== INICIO CAMPOS AÑADIDOS =====
            birth_date: formData.get('birth_date') || null,
            weight: parseFloat(formData.get('weight')) || null,
            image_url: imageUrl,
            // ===== FIN CAMPOS AÑADIDOS =====
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
            if (currentClientId) {
                modalContentBody.innerHTML = '<div class="text-center py-10 text-gray-500">Actualizando...</div>';
                const updatedDetails = await getClientDetails(currentClientId);
                if (updatedDetails) {
                    populateModal(updatedDetails);
                }
            }
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
            modalContentBody.innerHTML = '<div class="text-center py-10 text-gray-500">Cargando...</div>';
            
            const clientDetails = await getClientDetails(clientId);
            
            if (clientDetails) {
                populateModal(clientDetails);
            } else {
                modalContentBody.innerHTML = '<div class="text-center py-10 text-red-500">Error al cargar los detalles del cliente.</div>';
            }
        }
    });

    modalCloseBtn?.addEventListener('click', closeModal);
    clientDetailsModal?.addEventListener('click', (event) => {
        if (event.target === clientDetailsModal) {
            closeModal();
        }
    });
};

// --- INICIALIZACIÓN DE LA SECCIÓN ---
const initializeClientsSection = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Gestión de Clientes';
    }
    
    const initialClients = await getClients();
    renderClientsTable(initialClients);
    setupEventListeners();
    setupClientModal();
    setupAddPetModal();
};

document.addEventListener('DOMContentLoaded', initializeClientsSection);