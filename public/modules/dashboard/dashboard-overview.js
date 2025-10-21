// public/modules/dashboard/dashboard-overview.js

import { getDashboardStats, getUpcomingAppointments, getMonthlyAppointmentsStats, getPetsNeedingAppointment } from './dashboard.api.js';
import { createUpcomingAppointmentItem } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const appointmentsCountElement = document.querySelector('#appointments-count');
const productsCountElement = document.querySelector('#products-count');
const upcomingAppointmentsList = document.querySelector('#upcoming-appointments-list');
const headerTitle = document.querySelector('#header-title');
const appointmentsChartCanvas = document.querySelector('#appointments-chart');
const remindersList = document.querySelector('#reminders-list'); // Nuevo elemento

/**
 * Renderiza el gráfico de citas mensuales.
 * @param {Array<Object>} stats - Datos de la API con {month_name, service_count}.
 */
const renderAppointmentsChart = (stats) => {
    if (!appointmentsChartCanvas) return;

    new Chart(appointmentsChartCanvas, {
        type: 'bar',
        data: {
            labels: stats.map(s => s.month_name),
            datasets: [{
                label: 'Servicios Completados',
                data: stats.map(s => s.service_count),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(5, 150, 105, 1)',
                borderWidth: 2,
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleFont: { weight: 'bold' },
                    bodyFont: { size: 14 },
                    padding: 12,
                    cornerRadius: 6,
                }
            }
        }
    });
};

// --- NUEVA FUNCIÓN PARA RENDERIZAR RECORDATORIOS ---
const createReminderItem = (pet) => {
    const ownerName = pet.profiles?.first_name ? `${pet.profiles.first_name} ${pet.profiles.last_name}` : pet.profiles?.full_name || 'Dueño';
    const lastServiceDate = new Date(pet.last_grooming_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
    
    // El enlace inteligente que pasa los IDs a la página de citas
    const scheduleLink = `/public/modules/dashboard/dashboard-appointments.html?clientId=${pet.owner_id}&petId=${pet.id}`;

    return `
        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div class="flex items-center space-x-3">
                <img src="${pet.image_url || `https://ui-avatars.com/api/?name=${pet.name.charAt(0)}&background=E2E8F0&color=4A5568`}" alt="${pet.name}" class="h-10 w-10 rounded-full object-cover">
                <div>
                    <p class="text-sm font-bold text-gray-900">${pet.name}</p>
                    <p class="text-xs text-gray-600">${ownerName} - Última cita: ${lastServiceDate}</p>
                </div>
            </div>
            <a href="${scheduleLink}" class="text-xs bg-green-600 text-white font-semibold py-1 px-3 rounded-full hover:bg-green-700 transition-colors">
                Agendar
            </a>
        </div>
    `;
};


// --- RENDERIZADO DE DATOS OPTIMIZADO ---
const loadOverviewData = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Dashboard';
    }

    // Hacemos todas las llamadas en paralelo para máxima velocidad
    const [stats, upcomingAppointments, monthlyStats, petsForReminders] = await Promise.all([
        getDashboardStats(),
        getUpcomingAppointments(),
        getMonthlyAppointmentsStats(),
        getPetsNeedingAppointment() // Nueva llamada a la API
    ]);

    // Actualizamos los contadores
    if (clientCountElement) clientCountElement.textContent = stats.clients;
    if (petCountElement) petCountElement.textContent = stats.pets;
    if (appointmentsCountElement) appointmentsCountElement.textContent = stats.appointments;
    if (productsCountElement) productsCountElement.textContent = stats.products;

    // Actualizamos la lista de próximas citas
    if (upcomingAppointmentsList) {
        upcomingAppointmentsList.innerHTML = upcomingAppointments.length > 0 
            ? upcomingAppointments.map(createUpcomingAppointmentItem).join('') 
            : `<p class="text-sm text-gray-500 text-center py-4">No hay citas programadas.</p>`;
    }

    // Renderizamos el nuevo gráfico
    renderAppointmentsChart(monthlyStats);

    // --- NUEVA LÓGICA PARA RENDERIZAR RECORDATORIOS ---
    if (remindersList) {
        if (petsForReminders.length > 0) {
            remindersList.innerHTML = petsForReminders.map(createReminderItem).join('');
        } else {
            remindersList.innerHTML = `<p class="text-sm text-gray-500 text-center py-8">No hay recordatorios de citas pendientes.</p>`;
        }
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadOverviewData);