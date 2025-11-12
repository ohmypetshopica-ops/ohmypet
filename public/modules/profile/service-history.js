// public/modules/profile/service-history.js

import { supabase } from '../../core/supabase.js';
import { getProfile } from './profile.api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const serviceHistoryContainer = document.getElementById('service-history-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const petFilterSelect = document.getElementById('pet-filter');

    if (!serviceHistoryContainer) return;

    let userCache = null;
    let petsCache = [];

    const fetchUserData = async () => {
        if (userCache) return userCache;
        const { user, profile } = await getProfile();
        if (!user) {
            window.location.href = '/public/modules/login/login.html';
            return null;
        }
        userCache = { user, profile };
        return userCache;
    };

    const fetchPets = async (userId) => {
        if (petsCache.length > 0) return petsCache;
        const { data: pets, error } = await supabase
            .from('pets')
            .select('id, name')
            .eq('owner_id', userId);
        
        if (error) {
            console.error('Error fetching pets:', error);
            return [];
        }
        petsCache = pets || [];
        return petsCache;
    };

    const fetchServiceHistory = async (userId, petId = null) => {
        let query = supabase
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                service,
                status,
                final_observations,
                final_weight,
                service_price,
                payment_method,
                shampoo_type,
                invoice_pdf_url,
                pets (id, name, image_url),
                appointment_photos (photo_type, image_url)
            `)
            .eq('user_id', userId)
            .eq('status', 'completada')
            .order('appointment_date', { ascending: false });

        if (petId) {
            query = query.eq('pet_id', petId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching service history:', error);
            return [];
        }
        return data;
    };

    const renderServiceHistory = (services) => {
        if (services.length === 0) {
            serviceHistoryContainer.innerHTML = '<p class="text-center text-gray-500 py-8">No tienes historial de servicios completados.</p>';
            return;
        }

        serviceHistoryContainer.innerHTML = services.map(service => {
            const petName = service.pets?.name || 'Mascota';
            const petImage = service.pets?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(petName)}&background=A4D0A4&color=FFFFFF`;
            
            // **** INICIO DE LA CORRECCIÓN ****
            // Forzar mayúsculas en la visualización para consistencia
            const paymentMethod = (service.payment_method || 'No especificado').toUpperCase();
            // **** FIN DE LA CORRECCIÓN ****

            const photos = service.appointment_photos || [];
            const arrivalPhoto = photos.find(p => p.photo_type === 'arrival')?.image_url;
            const departurePhoto = photos.find(p => p.photo_type === 'departure')?.image_url;

            return `
                <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 ease-in-out">
                    <div class="p-5">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <img src="${petImage}" alt="${petName}" class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md">
                                <div>
                                    <h3 class="text-xl font-bold text-gray-800">${petName}</h3>
                                    <p class="text-sm font-semibold text-green-600">${service.service}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-medium text-gray-700">${new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                <p class="text-2xl font-bold text-gray-800 mt-1">S/ ${service.service_price ? service.service_price.toFixed(2) : '0.00'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="px-5 py-4 bg-gray-50 border-t border-gray-200 grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <span class="text-xs font-semibold text-gray-500 block">Método de Pago</span>
                            <span class="text-sm font-medium text-gray-800">${paymentMethod}</span>
                        </div>
                        <div>
                            <span class="text-xs font-semibold text-gray-500 block">Peso Final</span>
                            <span class="text-sm font-medium text-gray-800">${service.final_weight ? service.final_weight + ' kg' : 'N/A'}</span>
                        </div>
                        <div>
                            <span class="text-xs font-semibold text-gray-500 block">Shampoo</span>
                            <span class="text-sm font-medium text-gray-800">${service.shampoo_type || 'General'}</span>
                        </div>
                    </div>
                    
                    ${(arrivalPhoto || departurePhoto) ? `
                    <div class="p-5">
                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Fotos del Servicio</h4>
                        <div class="grid grid-cols-2 gap-4">
                            ${arrivalPhoto ? `
                            <div>
                                <img src="${arrivalPhoto}" alt="Foto de llegada" class="w-full h-32 object-cover rounded-lg shadow-md">
                                <p class="text-xs text-center text-gray-500 mt-2">Llegada</p>
                            </div>
                            ` : ''}
                            ${departurePhoto ? `
                            <div>
                                <img src="${departurePhoto}" alt="Foto de salida" class="w-full h-32 object-cover rounded-lg shadow-md">
                                <p class="text-xs text-center text-gray-500 mt-2">Salida</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <div class="px-5 py-4 bg-gray-50 border-t border-gray-200">
                        <h4 class="text-sm font-semibold text-gray-700 mb-2">Observaciones del Servicio</h4>
                        <p class="text-sm text-gray-600 italic">
                            ${service.final_observations || 'No se dejaron observaciones para este servicio.'}
                        </p>
                    </div>

                    ${service.invoice_pdf_url ? `
                    <div class="px-5 py-3 bg-white border-t border-gray-200">
                         <a href="${service.invoice_pdf_url}" target="_blank" class="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
                            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Descargar Boleta/Comprobante
                        </a>
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    };

    const populatePetFilter = (pets) => {
        if (!petFilterSelect) return;
        petFilterSelect.innerHTML = '<option value="">Todas mis mascotas</option>';
        pets.forEach(pet => {
            const option = document.createElement('option');
            option.value = pet.id;
            option.textContent = pet.name;
            petFilterSelect.appendChild(option);
        });
    };

    const loadPage = async () => {
        const userData = await fetchUserData();
        if (!userData) return;
        
        const [pets, services] = await Promise.all([
            fetchPets(userData.user.id),
            fetchServiceHistory(userData.user.id)
        ]);

        populatePetFilter(pets);
        renderServiceHistory(services);
        
        loadingSpinner?.classList.add('hidden');
        serviceHistoryContainer?.classList.remove('hidden');
        petFilterSelect?.classList.remove('hidden');

        petFilterSelect.addEventListener('change', async (e) => {
            const petId = e.target.value;
            loadingSpinner.classList.remove('hidden');
            serviceHistoryContainer.classList.add('hidden');
            const filteredServices = await fetchServiceHistory(userData.user.id, petId);
            renderServiceHistory(filteredServices);
            loadingSpinner.classList.add('hidden');
            serviceHistoryContainer.classList.remove('hidden');
        });
    };

    loadPage();
});