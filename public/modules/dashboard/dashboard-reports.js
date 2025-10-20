import { getReportData, getSalesReportData } from './dashboard.api.js';

// --- ELEMENTOS DEL DOM ---
const headerTitle = document.querySelector('#header-title');
const startDateInput = document.querySelector('#start-date');
const endDateInput = document.querySelector('#end-date');
const generateReportBtn = document.querySelector('#generate-report-btn');
const reportContent = document.querySelector('#report-content');

// KPIs de Servicios
const totalRevenueEl = document.querySelector('#total-revenue');
const serviceCountEl = document.querySelector('#service-count');
const averageRevenueEl = document.querySelector('#average-revenue');

// Gráfico y Descargas de Servicios
const paymentChartCanvas = document.querySelector('#payment-chart');
const downloadFinancialCsvBtn = document.querySelector('#download-financial-csv');

// =================== NUEVOS ELEMENTOS PARA VENTAS ===================
// KPIs de Ventas
const totalSalesRevenueEl = document.querySelector('#total-sales-revenue');
const productsSoldCountEl = document.querySelector('#products-sold-count');

// Gráfico y Descargas de Ventas
const productSalesChartCanvas = document.querySelector('#product-sales-chart');
const downloadSalesCsvBtn = document.querySelector('#download-sales-csv');
// =================== FIN DE NUEVOS ELEMENTOS ===================

let paymentChart = null;
let productSalesChart = null; // Variable para el nuevo gráfico de ventas
let reportDataCache = null;

// --- FUNCIONES ---

const updateKpiCards = (data) => {
    const totalRevenue = data.totalRevenue || 0;
    const serviceCount = data.serviceCount || 0;
    const averageRevenue = serviceCount > 0 ? (totalRevenue / serviceCount) : 0;

    totalRevenueEl.textContent = `S/ ${totalRevenue.toFixed(2)}`;
    serviceCountEl.textContent = serviceCount;
    averageRevenueEl.textContent = `S/ ${averageRevenue.toFixed(2)}`;
};

// =================== NUEVA FUNCIÓN PARA KPIs DE VENTAS ===================
const updateSalesKpiCards = (salesData) => {
    const totalSalesRevenue = salesData.totalSalesRevenue || 0;
    const productsSoldCount = salesData.productsSoldCount || 0;

    totalSalesRevenueEl.textContent = `S/ ${totalSalesRevenue.toFixed(2)}`;
    productsSoldCountEl.textContent = productsSoldCount;
};
// =================== FIN DE LA NUEVA FUNCIÓN ===================

const renderPaymentChart = (paymentSummary) => {
    if (paymentChart) {
        paymentChart.destroy();
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
            plugins: { legend: { position: 'bottom' } }
        }
    });
};

// =================== NUEVA FUNCIÓN PARA GRÁFICO DE VENTAS ===================
const renderProductSalesChart = (categorySummary) => {
    if (productSalesChart) {
        productSalesChart.destroy();
    }
    const labels = categorySummary.map(item => item.category);
    const data = categorySummary.map(item => item.total);
    const backgroundColors = ['#EF4444', '#F97316', '#84CC16', '#3B82F6', '#6366F1'];
    productSalesChart = new Chart(productSalesChartCanvas, {
        type: 'doughnut',
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
            plugins: { legend: { position: 'bottom' } }
        }
    });
};
// =================== FIN DE LA NUEVA FUNCIÓN ===================

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

const generateReport = async () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        alert('Por favor, selecciona un rango de fechas válido.');
        return;
    }

    generateReportBtn.disabled = true;
    generateReportBtn.textContent = 'Generando...';

    // OBTENER AMBOS REPORTES EN PARALELO
    const [serviceReportData, salesReportData] = await Promise.all([
        getReportData(startDate, endDate),
        getSalesReportData(startDate, endDate)
    ]);
    
    reportDataCache = { serviceReportData, salesReportData }; // Guardar ambos en caché

    if (serviceReportData) {
        updateKpiCards(serviceReportData);
        renderPaymentChart(serviceReportData.paymentSummary);
    } else {
        alert('No se pudieron obtener los datos para el reporte de servicios.');
    }

    // =================== LLAMAR A LAS NUEVAS FUNCIONES DE VENTAS ===================
    if (salesReportData) {
        updateSalesKpiCards(salesReportData);
        renderProductSalesChart(salesReportData.categorySummary);
    } else {
        alert('No se pudieron obtener los datos para el reporte de ventas.');
    }
    // =================== FIN DE LA LLAMADA ===================

    if (serviceReportData || salesReportData) {
        reportContent.classList.remove('hidden');
    } else {
        reportContent.classList.add('hidden');
    }

    generateReportBtn.disabled = false;
    generateReportBtn.textContent = 'Generar Reporte';
};

const initializeReportsPage = () => {
    if (headerTitle) {
        headerTitle.textContent = 'Reportes';
    }

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    startDateInput.value = firstDayOfMonth;
    endDateInput.value = lastDayOfMonth;

    generateReportBtn.addEventListener('click', generateReport);
    
    downloadFinancialCsvBtn.addEventListener('click', () => {
        if (reportDataCache && reportDataCache.serviceReportData?.detailedServices) {
            downloadCsv('reporte_servicios.csv', reportDataCache.serviceReportData.detailedServices);
        } else {
            alert('Primero genera un reporte para poder descargarlo.');
        }
    });

    // =================== EVENT LISTENER PARA EL NUEVO BOTÓN DE DESCARGA ===================
    downloadSalesCsvBtn.addEventListener('click', () => {
        if (reportDataCache && reportDataCache.salesReportData?.detailedSales) {
            downloadCsv('reporte_ventas.csv', reportDataCache.salesReportData.detailedSales);
        } else {
            alert('Primero genera un reporte para poder descargarlo.');
        }
    });
    // =================== FIN DEL EVENT LISTENER ===================

    generateReport();
};

document.addEventListener('DOMContentLoaded', initializeReportsPage);