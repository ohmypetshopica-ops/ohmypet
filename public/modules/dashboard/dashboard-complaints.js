console.log("✅ VERSIÓN 2.0 del archivo dashboard-complaints.js cargada."); // <--- NUESTRA SEÑAL

import { supabase } from '../../core/supabase.js';

// --- ELEMENTOS DEL DOM ---
const complaintsTableBody = document.querySelector('#complaints-table-body');
const headerTitle = document.querySelector('#header-title');

// --- ELEMENTOS DEL MODAL ---
const modal = document.querySelector('#complaint-details-modal');
const closeModalBtn = document.querySelector('#close-modal-btn');
const updateStatusBtn = document.querySelector('#update-status-btn');
const statusSelect = document.querySelector('#status-select');

let allComplaints = []; // Caché local para los reclamos
let currentComplaintId = null; // ID del reclamo que se está viendo

// --- LÓGICA DEL MODAL ---

const openComplaintModal = (complaint) => {
    currentComplaintId = complaint.id;
    // Rellenar datos del cliente
    document.querySelector('#modal-client-name').textContent = `${complaint.first_name} ${complaint.last_name}`;
    document.querySelector('#modal-client-doc').textContent = `${complaint.doc_type} - ${complaint.doc_num}`;
    document.querySelector('#modal-client-email').textContent = complaint.email;
    document.querySelector('#modal-client-phone').textContent = complaint.phone || 'No especificado';

    // Rellenar datos del reclamo
    document.querySelector('#modal-complaint-type').textContent = complaint.tipo_reclamo;
    document.querySelector('#modal-complaint-date').textContent = new Date(complaint.created_at).toLocaleDateString('es-ES');
    document.querySelector('#modal-complaint-item').textContent = complaint.bien_contratado;
    document.querySelector('#modal-complaint-amount').textContent = complaint.monto ? complaint.monto.toFixed(2) : 'No especificado';
    
    // Rellenar detalles
    document.querySelector('#modal-item-description').textContent = complaint.description || 'No especificado';
    document.querySelector('#modal-complaint-details').textContent = complaint.detalle_reclamo;
    document.querySelector('#modal-client-request').textContent = complaint.pedido;

    // Seleccionar el estado actual
    statusSelect.value = complaint.status;
    
    modal.classList.remove('hidden');
};

const closeComplaintModal = () => {
    modal.classList.add('hidden');
    currentComplaintId = null;
};

// --- FUNCIONES DE LA API Y RENDERIZADO ---

const getComplaints = async () => {
    const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error al obtener los reclamos:', error);
        return [];
    }
    return data;
};

const createComplaintRow = (complaint) => {
    const formattedDate = new Date(complaint.created_at).toLocaleDateString('es-ES');
    const statusStyles = { pendiente: 'bg-yellow-100 text-yellow-800', atendido: 'bg-green-100 text-green-800', 'en proceso': 'bg-blue-100 text-blue-800' };
    const statusClass = statusStyles[complaint.status] || 'bg-gray-100 text-gray-800';
    
    const complaintDataString = JSON.stringify(complaint).replace(/"/g, '&quot;');

    return `
        <tr data-id="${complaint.id}">
            <td class="px-6 py-4"><div class="text-sm font-medium text-gray-900">${complaint.first_name} ${complaint.last_name}</div><div class="text-sm text-gray-500">${complaint.email}</div></td>
            <td class="px-6 py-4 text-sm text-gray-800 capitalize">${complaint.tipo_reclamo}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${formattedDate}</td>
            <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${complaint.status}</span></td>
            <td class="px-6 py-4 text-sm font-medium text-right">
                <button data-complaint='${complaintDataString}' class="view-details-btn text-green-600 hover:text-green-900">Ver Detalles</button>
            </td>
        </tr>
    `;
};

const renderTable = (complaints) => {
    if (complaints.length > 0) {
        complaintsTableBody.innerHTML = complaints.map(createComplaintRow).join('');
    } else {
        complaintsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay reclamos registrados.</td></tr>';
    }
}

// --- INICIALIZACIÓN Y MANEJO DE EVENTOS ---

const initializeComplaintsSection = async () => {
    if (headerTitle) headerTitle.textContent = 'Gestión de Reclamos';
    
    complaintsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">Cargando reclamos...</td></tr>';
    
    allComplaints = await getComplaints();
    renderTable(allComplaints);

    complaintsTableBody.addEventListener('click', (event) => {
        const button = event.target.closest('.view-details-btn');
        if (button) {
            const complaintData = JSON.parse(button.dataset.complaint.replace(/&quot;/g, '"'));
            openComplaintModal(complaintData);
        }
    });

    closeModalBtn.addEventListener('click', closeComplaintModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeComplaintModal();
    });

    updateStatusBtn.addEventListener('click', async () => {
        if (!currentComplaintId) return;
        
        const newStatus = statusSelect.value;
        const { error } = await supabase.from('complaints').update({ status: newStatus }).eq('id', currentComplaintId);

        if (error) {
            alert('Error al actualizar el estado: ' + error.message);
        } else {
            const index = allComplaints.findIndex(c => c.id === currentComplaintId);
            if (index !== -1) allComplaints[index].status = newStatus;
            renderTable(allComplaints);
            closeComplaintModal();
        }
    });
};

document.addEventListener('DOMContentLoaded', initializeComplaintsSection);