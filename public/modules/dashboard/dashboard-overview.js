// public/modules/dashboard/dashboard-overview.js

// 1. Importar funciones de sus respectivos archivos API
import { getClientCount } from './clients.api.js';
import { getPetCount, getPetsNeedingAppointment } from './pets.api.js';
import { getProductsCount } from './products.api.js';
import { 
    getAppointmentsCount, 
    getUpcomingAppointments, 
    getMonthlyAppointmentsStats 
} from './appointments.api.js';

import { createUpcomingAppointmentItem } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const appointmentsCountElement = document.querySelector('#appointments-count');
const productsCountElement = document.querySelector('#products-count');
const upcomingAppointmentsList = document.querySelector('#upcoming-appointments-list');
const headerTitle = document.querySelector('#header-title');
const appointmentsChartCanvas = document.querySelector('#appointments-chart');
const remindersList = document.querySelector('#reminders-list');

/**
 * Renderiza el gráfico de citas mensuales.
 */
const renderAppointmentsChart = (stats) => {
    if (!appointmentsChartCanvas) return;
    
    // Destruir gráfico previo si existe para evitar superposiciones (aunque en loadOverviewData se crea una vez)
    // En Chart.js vanilla a veces se guarda la instancia en el canvas, pero aquí asumiremos recarga limpia.

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
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
};

const createReminderItem = (pet) => {
    const ownerName = pet.profiles?.first_name ? `${pet.profiles.first_name} ${pet.profiles.last_name}` : pet.profiles?.full_name || 'Dueño';
    const lastServiceDate = new Date(pet.last_grooming_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    
    // Enlace para agendar pasando parámetros
    const scheduleLink = `/public/modules/dashboard/dashboard-appointments.html?clientId=${pet.owner_id}&petId=${pet.id}`;

    return `
        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0">
            <div class="flex items-center space-x-3">
                <div class="h-10 w-10 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center font-bold shrink-0">
                    ${pet.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-900">${pet.name}</p>
                    <p class="text-xs text-gray-600">Ult: ${lastServiceDate} (${ownerName})</p>
                </div>
            </div>
            <a href="${scheduleLink}" class="text-xs bg-green-600 text-white font-semibold py-1.5 px-3 rounded hover:bg-green-700 transition-colors">
                Agendar
            </a>
        </div>
    `;
};


const loadOverviewData = async () => {
    if (headerTitle) headerTitle.textContent = 'Dashboard';

    try {
        const [
            clientCount, 
            petCount, 
            appointmentsCount, 
            productsCount, 
            upcomingAppointments, 
            monthlyStats, 
            petsForReminders
        ] = await Promise.all([
            getClientCount(),
            getPetCount(),
            getAppointmentsCount(),
            getProductsCount(),
            getUpcomingAppointments(),
            getMonthlyAppointmentsStats(),
            getPetsNeedingAppointment()
        ]);

        // Actualizar contadores
        if (clientCountElement) clientCountElement.textContent = clientCount;
        if (petCountElement) petCountElement.textContent = petCount;
        if (appointmentsCountElement) appointmentsCountElement.textContent = appointmentsCount;
        if (productsCountElement) productsCountElement.textContent = productsCount;

        // Lista de próximas citas
        if (upcomingAppointmentsList) {
            upcomingAppointmentsList.innerHTML = upcomingAppointments.length > 0 
                ? upcomingAppointments.map(createUpcomingAppointmentItem).join('') 
                : `<p class="text-sm text-gray-500 text-center py-4">No hay citas programadas pronto.</p>`;
        }

        // Gráfico
        renderAppointmentsChart(monthlyStats);

        // Recordatorios
        if (remindersList) {
            if (petsForReminders.length > 0) {
                remindersList.innerHTML = petsForReminders.slice(0, 10).map(createReminderItem).join(''); // Limitar a 10
            } else {
                remindersList.innerHTML = `<p class="text-sm text-gray-500 text-center py-8">Al día con los servicios.</p>`;
            }
        }

    } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
    }
};

document.addEventListener('DOMContentLoaded', loadOverviewData);