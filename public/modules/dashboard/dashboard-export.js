// public/modules/dashboard/dashboard-export.js

import { getAllDenormalizedDataForExport } from './dashboard.api.js';

// --- ELEMENTOS DEL DOM ---
const exportAllDataBtn = document.getElementById('export-all-data-btn');
const exportMessage = document.getElementById('export-message');
const headerTitle = document.getElementById('header-title');

// --- UTILITY: CONVERTIR OBJETO A CSV ---
const convertToCsv = (data, headers) => {
    // Escapa valores y usa el separador ; para mayor compatibilidad con Excel Europeo/Latino
    const processValue = (value) => {
        if (value === null || value === undefined) return '';
        let str = String(value).replace(/"/g, '""');
        return `"${str}"`;
    };

    const csvRows = [];
    csvRows.push(headers.map(h => processValue(h)).join(';')); // Encabezados
    
    for (const row of data) {
        const values = headers.map(header => {
            // Se asume que los datos ya están en un formato plano (no anidado)
            // o que la key es el nombre de la columna real de Supabase (ej: first_name).
            
            // Para las denormalizaciones (pets, appointments, sales) usamos el nombre exacto:
            if (row.hasOwnProperty(header)) {
                return processValue(row[header]);
            }
            
            // Para la sección de clientes, la consulta es select simple, usamos el nombre de la columna:
            const key = header.replace(/ñ/g, 'n').replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/\s/g, '_').toLowerCase();

            if (row.hasOwnProperty(key)) {
                 return processValue(row[key]);
            }

            return '';
        });
        csvRows.push(values.join(';'));
    }

    // Retorna el string con el BOM (Byte Order Mark) para UTF-8 en Excel
    return '\ufeff' + csvRows.join('\n');
};

const triggerDownload = (data, filename) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// --- ESTRUCTURA DE EXPORTACIÓN (ACTUALIZADA) ---
const EXPORT_SECTIONS = {
    clients: {
        title: "Clientes",
        filename: "Clientes_OhMyPet.csv",
        headers: [
            "first_name", "last_name", "full_name", "email", "phone", "district",
            "doc_type", "doc_num", "emergency_contact_name", "emergency_contact_phone",
            "role"
        ],
        dataKey: 'clients'
    },
    pets: {
        title: "Mascotas",
        filename: "Mascotas_OhMyPet.csv",
        headers: [
            "Nombre Mascota", "Raza", "Especie", "Tamaño", "Peso (kg)", "Sexo", "Fecha Nacimiento",
            "Dueño", "Frecuencia Recordatorio (días)", "Último Servicio", "Observaciones"
        ],
        dataKey: 'pets'
    },
    appointments: {
        title: "Citas",
        filename: "Citas_OhMyPet.csv",
        headers: [
            "Cliente", "Mascota", "Fecha Cita", "Hora Cita", "Servicio Solicitado", "Estado",
            "Precio Servicio (S/)", "Método Pago", "Peso Final (kg)", "Shampoo Utilizado",
            "Observaciones Finales"
        ],
        dataKey: 'appointments'
    },
    sales: {
        title: "Ventas",
        filename: "Ventas_OhMyPet.csv",
        // --- CAMPO "Detalle/Nota" AÑADIDO ---
        headers: [
            "Fecha Venta", "Cliente", "Producto", "Detalle/Nota", "Categoría Producto", "Cantidad",
            "Precio Total (S/)", "Método Pago"
        ],
        dataKey: 'sales'
    },
    complaints: {
        title: "Reclamos",
        filename: "Reclamos_OhMyPet.csv",
        headers: [
            "created_at", "status", "doc_type", "doc_num", "first_name", "last_name",
            "mother_last_name", "email", "phone", "district", "bien_contratado", "monto",
            "description", "tipo_reclamo", "detalle_reclamo", "pedido"
        ],
        dataKey: 'complaints'
    }
};

// --- MANEJO DE LA EXPORTACIÓN PRINCIPAL ---
const handleExportAll = async () => {
    exportAllDataBtn.disabled = true;
    exportAllDataBtn.textContent = 'Preparando datos...';
    exportMessage.className = 'mt-6 p-4 rounded-lg bg-blue-100 text-blue-700 text-sm';
    exportMessage.textContent = '⏳ Obteniendo todos los datos de la base de datos... Esto puede tardar unos segundos.';
    exportMessage.classList.remove('hidden');

    const result = await getAllDenormalizedDataForExport();

    if (result.error) {
        exportMessage.className = 'mt-6 p-4 rounded-lg bg-red-100 text-red-700 text-sm';
        exportMessage.textContent = `❌ Error al obtener los datos para exportar: ${result.error}. Revisa la consola para más detalles.`;
        exportAllDataBtn.disabled = false;
        exportAllDataBtn.textContent = 'Descargar todos los datos (CSV)';
        return;
    }

    let successCount = 0;
    
    // Iterar sobre cada sección y disparar la descarga
    for (const key in EXPORT_SECTIONS) {
        const section = EXPORT_SECTIONS[key];
        const rawData = result[section.dataKey];
        
        if (rawData && rawData.length > 0) {
            exportMessage.textContent = `✅ Convirtiendo y descargando: ${section.title}...`;
            const csvData = convertToCsv(rawData, section.headers);
            // Pequeño retardo para asegurar que los navegadores manejen múltiples descargas
            await new Promise(resolve => setTimeout(resolve, 500)); 
            triggerDownload(csvData, section.filename);
            successCount++;
        } else {
            console.log(`Advertencia: No hay datos para la sección ${section.title}.`);
        }
    }
    
    exportMessage.className = 'mt-6 p-4 rounded-lg bg-green-100 text-green-700 text-sm';
    exportMessage.textContent = `🎉 Éxito: Se han generado y descargado ${successCount} archivos CSV. Revisa tu carpeta de descargas.`;
    
    exportAllDataBtn.disabled = false;
    exportAllDataBtn.textContent = 'Descargar todos los datos (CSV)';
};


// --- INICIALIZACIÓN ---
const initializeExportPage = () => {
    if (headerTitle) {
        headerTitle.textContent = 'Exportar Datos';
    }
    exportAllDataBtn.addEventListener('click', handleExportAll);
};

document.addEventListener('DOMContentLoaded', initializeExportPage);