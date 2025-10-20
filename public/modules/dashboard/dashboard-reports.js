import { getReportData } from './dashboard.api.js';

// --- ELEMENTOS DEL DOM ---
const headerTitle = document.querySelector('#header-title');
const startDateInput = document.querySelector('#start-date');
const endDateInput = document.querySelector('#end-date');
const generateReportBtn = document.querySelector('#generate-report-btn');
const reportContent = document.querySelector('#report-content');

// KPIs
const totalRevenueEl = document.querySelector('#total-revenue');
const serviceCountEl = document.querySelector('#service-count');
const averageRevenueEl = document.querySelector('#average-revenue');

// Gráfico y Descargas
const paymentChartCanvas = document.querySelector('#payment-chart');
const downloadFinancialCsvBtn = document.querySelector('#download-financial-csv');

let paymentChart = null; // Variable para almacenar la instancia del gráfico
let reportDataCache = null; // Caché para los datos del reporte actual

// --- FUNCIONES ---

/**
 * Actualiza las tarjetas de KPIs.
 */
const updateKpiCards = (data) => {
    const totalRevenue = data.totalRevenue || 0;
    const serviceCount = data.serviceCount || 0;
    const averageRevenue = serviceCount > 0 ? (totalRevenue / serviceCount) : 0;

    totalRevenueEl.textContent = `S/ ${totalRevenue.toFixed(2)}`;
    serviceCountEl.textContent = serviceCount;
    averageRevenueEl.textContent = `S/ ${averageRevenue.toFixed(2)}`;
};

/**
 * Renderiza el gráfico de métodos de pago.
 */
const renderPaymentChart = (paymentSummary) => {
    if (paymentChart) {
        paymentChart.destroy(); // Destruir gráfico anterior si existe
    }

    const labels = paymentSummary.map(item => item.payment_method);
    const data = paymentSummary.map(item => item.total);
    const backgroundColors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

    paymentChart = new Chart(paymentChartCanvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
};

/**
 * Genera y descarga un archivo CSV.
 */
const downloadCsv = (filename, data) => {
    if (!data || data.length === 0) {
        alert("No hay datos para descargar.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
};

/**
 * Función principal para generar el reporte.
 */
const generateReport = async () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        alert('Por favor, selecciona un rango de fechas válido.');
        return;
    }

    generateReportBtn.disabled = true;
    generateReportBtn.textContent = 'Generando...';

    const data = await getReportData(startDate, endDate);
    reportDataCache = data; // Guardar datos en caché

    if (data) {
        updateKpiCards(data);
        renderPaymentChart(data.paymentSummary);
        reportContent.classList.remove('hidden');
    } else {
        alert('No se pudieron obtener los datos para el reporte.');
        reportContent.classList.add('hidden');
    }

    generateReportBtn.disabled = false;
    generateReportBtn.textContent = 'Generar Reporte';
};

/**
 * Inicializa la página.
 */
const initializeReportsPage = () => {
    if (headerTitle) {
        headerTitle.textContent = 'Reportes';
    }

    // Configurar fechas por defecto (mes actual)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    startDateInput.value = firstDayOfMonth;
    endDateInput.value = lastDayOfMonth;

    // Listeners
    generateReportBtn.addEventListener('click', generateReport);
    downloadFinancialCsvBtn.addEventListener('click', () => {
        if (reportDataCache && reportDataCache.detailedServices) {
            downloadCsv('reporte_financiero.csv', reportDataCache.detailedServices);
        } else {
            alert('Primero genera un reporte para poder descargarlo.');
        }
    });

    // Generar reporte inicial al cargar la página
    generateReport();
};

document.addEventListener('DOMContentLoaded', initializeReportsPage);