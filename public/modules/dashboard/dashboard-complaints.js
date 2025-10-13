import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const complaintsTableBody = document.querySelector('#complaints-table-body');
const headerTitle = document.querySelector('#header-title');

// --- FUNCIÓN PARA OBTENER RECLAMOS ---
const getComplaints = async () => {
    const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false }); // Mostrar los más nuevos primero

    if (error) {
        console.error('Error al obtener los reclamos:', error);
        return [];
    }
    return data;
};

// --- FUNCIÓN PARA CREAR UNA FILA DE LA TABLA ---
const createComplaintRow = (complaint) => {
    // Formatear la fecha a un formato legible (ej: 13/10/2025)
    const formattedDate = new Date(complaint.created_at).toLocaleDateString('es-ES');
    
    // Asignar colores según el estado del reclamo
    const statusStyles = {
        pendiente: 'bg-yellow-100 text-yellow-800',
        atendido: 'bg-green-100 text-green-800',
        'en proceso': 'bg-blue-100 text-blue-800'
    };
    const statusClass = statusStyles[complaint.status] || 'bg-gray-100 text-gray-800';

    return `
        <tr data-id="${complaint.id}">
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">${complaint.first_name} ${complaint.last_name}</div>
                <div class="text-sm text-gray-500">${complaint.email}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-800 capitalize">${complaint.tipo_reclamo}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${formattedDate}</td>
            <td class="px-6 py-4">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                    ${complaint.status}
                </span>
            </td>
            <td class="px-6 py-4 text-sm font-medium text-right">
                <a href="#" class="text-green-600 hover:text-green-900">Ver Detalles</a>
            </td>
        </tr>
    `;
};

// --- FUNCIÓN PRINCIPAL DE INICIALIZACIÓN ---
const initializeComplaintsSection = async () => {
    // Actualizar el título principal del header del dashboard
    if (headerTitle) {
        headerTitle.textContent = 'Gestión de Reclamos';
    }
    
    complaintsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">Cargando reclamos...</td></tr>';
    
    const complaints = await getComplaints();
    
    if (complaints.length > 0) {
        complaintsTableBody.innerHTML = complaints.map(createComplaintRow).join('');
    } else {
        complaintsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay reclamos registrados.</td></tr>';
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', initializeComplaintsSection);