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
    const formattedDate = new Date(complaint.created_at).toLocaleDateString('es-ES');
    return `
        <tr>
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">${complaint.first_name} ${complaint.last_name}</div>
                <div class="text-sm text-gray-500">${complaint.email}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-800 capitalize">${complaint.tipo_reclamo}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${formattedDate}</td>
            <td class="px-6 py-4">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    ${complaint.status}
                </span>
            </td>
            <td class="px-6 py-4 text-sm font-medium">
                <a href="#" class="text-green-600 hover:text-green-900">Ver Detalles</a>
            </td>
        </tr>
    `;
};

// --- FUNCIÓN PRINCIPAL DE INICIALIZACIÓN ---
const initializeComplaintsSection = async () => {
    if (headerTitle) {
        headerTitle.textContent = 'Gestión de Reclamos';
    }
    
    complaintsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Cargando reclamos...</td></tr>';
    
    const complaints = await getComplaints();
    
    if (complaints.length > 0) {
        complaintsTableBody.innerHTML = complaints.map(createComplaintRow).join('');
    } else {
        complaintsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay reclamos registrados.</td></tr>';
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', initializeComplaintsSection);