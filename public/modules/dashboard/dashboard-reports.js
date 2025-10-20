import { getReportData } from './dashboard.api.js';

// --- ELEMENTOS DEL DOM ---
const headerTitle = document.querySelector('#header-title');
const startDateInput = document.querySelector('#start-date');
const endDateInput = document.querySelector('#end-date');
const generateReportBtn = document.querySelector('#generate-report-btn');
const reportContent = document.querySelector('#report-content');

// --- KPIs de Servicios ---
const totalRevenueServicesEl = document.querySelector('#total-revenue-services');
const serviceCountEl = document.querySelector('#service-count');
const averageRevenueEl = document.querySelector('#average-revenue');
const paymentChartServicesCanvas = document.querySelector('#payment-chart-services');
const downloadServicesCsvBtn = document.querySelector('#download-services-csv');

// --- KPIs de Ventas ---
const totalRevenueSalesEl = document.querySelector('#total-revenue-sales');
const salesCountEl = document.querySelector('#sales-count');
const averageRevenueSalesEl = document.querySelector('#average-revenue-sales');
const paymentChartSalesCanvas = document.querySelector('#payment-chart-sales');
const downloadSalesCsvBtn = document.querySelector('#download-sales-csv');

let servicesChart = null;
let salesChart = null;
let reportDataCache = null;

// --- FUNCIONES ---

const updateKpiCards = (data) => {
    // Actualizar KPIs de Servicios
    const servicesData = data.services;
    const servicesRevenue = servicesData.totalRevenue || 0;
    const serviceCount = servicesData.count || 0;
    const avgServiceRevenue = serviceCount > 0 ? (servicesRevenue / serviceCount) : 0;
    totalRevenueServicesEl.textContent = `S/ ${servicesRevenue.toFixed(2)}`;
    serviceCountEl.textContent = serviceCount;
    averageRevenueEl.textContent = `S/ ${avgServiceRevenue.toFixed(2)}`;

    // Actualizar KPIs de Ventas
    const salesData = data.sales;
    const salesRevenue = salesData.totalRevenue || 0;
    const salesCount = salesData.count || 0;
    const avgSaleRevenue = salesCount > 0 ? (salesRevenue / salesCount) : 0;
    totalRevenueSalesEl.textContent = `S/ ${salesRevenue.toFixed(2)}`;
    salesCountEl.textContent = salesCount;
    averageRevenueSalesEl.textContent = `S/ ${avgSaleRevenue.toFixed(2)}`;
};

const renderChart = (canvas, chartInstance, paymentSummary, type) => {
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = paymentSummary.map(item => item.payment_method);
    const data = paymentSummary.map(item => item.total);
    const backgroundColors = type === 'services'
        ? ['#10B981', '#3B82F6', '#F59E0B', '#6366F1', '#EC4899']
        : ['#8B5CF6', '#F97316', '#14B8A6', '#EF4444', '#3B82F6'];

    return new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{ data, backgroundColor: backgroundColors, borderColor: '#ffffff', borderWidth: 2 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
};

const downloadCsv = (filename, data) => {
    if (!data || data.length === 0) {
        alert("No hay datos para descargar.");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header] !== null ? row[header] : '')).join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

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
    reportDataCache = data;

    if (data) {
        // =================== CORRECCIÓN APLICADA AQUÍ ===================
        // 1. Hacemos visible el contenedor de reportes ANTES de dibujar los gráficos.
        reportContent.classList.remove('hidden');

        // 2. Actualizamos los textos de las tarjetas (esto es seguro).
        updateKpiCards(data);

        // 3. Ahora que los contenedores de los gráficos son visibles, los renderizamos.
        servicesChart = renderChart(paymentChartServicesCanvas, servicesChart, data.services.paymentSummary, 'services');
        salesChart = renderChart(paymentChartSalesCanvas, salesChart, data.sales.paymentSummary, 'sales');
        // =================== FIN DE LA CORRECCIÓN ===================
    } else {
        alert('No se pudieron obtener los datos para el reporte.');
        reportContent.classList.add('hidden');
    }

    generateReportBtn.disabled = false;
    generateReportBtn.textContent = 'Generar Reporte';
};

const initializeReportsPage = () => {
    if (headerTitle) headerTitle.textContent = 'Reportes';

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    startDateInput.value = firstDayOfMonth;
    endDateInput.value = lastDayOfMonth;

    generateReportBtn.addEventListener('click', generateReport);

    downloadServicesCsvBtn.addEventListener('click', () => {
        if (reportDataCache?.services?.details) {
            downloadCsv('reporte_servicios.csv', reportDataCache.services.details);
        } else {
            alert('Primero genera un reporte para poder descargarlo.');
        }
    });
    
    downloadSalesCsvBtn.addEventListener('click', () => {
        if (reportDataCache?.sales?.details) {
            downloadCsv('reporte_ventas.csv', reportDataCache.sales.details);
        } else {
            alert('Primero genera un reporte para poder descargarlo.');
        }
    });

    generateReport();
};

document.addEventListener('DOMContentLoaded', initializeReportsPage);