// public/modules/dashboard/dashboard-overview.js

import { getDashboardStats, getUpcomingAppointments, getMonthlyAppointmentsStats } from './dashboard.api.js';
import { createUpcomingAppointmentItem } from './dashboard.utils.js';

// --- ELEMENTOS DEL DOM ---
const clientCountElement = document.querySelector('#client-count');
const petCountElement = document.querySelector('#pet-count');
const appointmentsCountElement = document.querySelector('#appointments-count');
const productsCountElement = document.querySelector('#products-count');
const upcomingAppointmentsList = document.querySelector('#upcoming-appointments-list');
const headerTitle = document.querySelector('#header-title');
const appointmentsChartCanvas = document.querySelector('#appointments-chart');

/**
 * Renderiza el gráfico de citas mensuales.
 * @param {Array<Object>} stats - Datos de la API con {month_name, service_count}.
 */
const renderAppointmentsChart = (stats) => {
    if (!appointmentsChartCanvas) return;

    const labels = stats.map(s => s.month_name);
    const data = stats.map(s => s.service_count);

    new Chart(appointmentsChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Servicios Completados',
                data: data,
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

// --- RENDERIZADO DE DATOS OPTIMIZADO ---
const loadOverviewData = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Dashboard';
    }

    // Hacemos las tres llamadas en paralelo para máxima velocidad
    const [stats, upcomingAppointments, monthlyStats] = await Promise.all([
        getDashboardStats(),
        getUpcomingAppointments(),
        getMonthlyAppointmentsStats()
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
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', loadOverviewData);