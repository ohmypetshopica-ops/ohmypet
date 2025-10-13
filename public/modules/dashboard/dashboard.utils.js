// public/modules/dashboard/dashboard.utils.js

// ... (mantén el resto del archivo como está) ...

// ===== FUNCIÓN createAppointmentRow CON LA LÓGICA CORREGIDA =====
const createAppointmentRow = (appointment) => {
    const petName = appointment.pets?.name || 'N/A';
    const ownerProfile = appointment.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'N/A';
    
    const statusStyles = {
        pendiente: { text: 'Pendiente', bg: 'bg-yellow-100', textColor: 'text-yellow-800' },
        confirmada: { text: 'Confirmada', bg: 'bg-blue-100', textColor: 'text-blue-800' },
        completada: { text: 'Completada', bg: 'bg-green-100', textColor: 'text-green-800' },
        cancelada: { text: 'Cancelada', bg: 'bg-red-100', textColor: 'text-red-800' },
        rechazada: { text: 'Rechazada', bg: 'bg-gray-100', textColor: 'text-gray-800' }
    };
    
    const status = (appointment.status || 'pendiente').toLowerCase().trim();
    const currentStyle = statusStyles[status] || statusStyles.pendiente;

    // Lógica de botones corregida:
    // El botón 'Fotos' siempre se incluye.
    let actionButtons = `
        <button data-action="fotos" class="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors">Fotos</button>
    `;

    // Los otros botones se añaden condicionalmente.
    if (status === 'pendiente') {
        actionButtons += `
            <button data-action="confirmar" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors">Confirmar</button>
            <button data-action="rechazar" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors">Rechazar</button>`;
    } else if (status === 'confirmada') {
        actionButtons += `<button data-action="completar" class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors">Completar</button>`;
    }
    // IMPORTANTE: Hemos eliminado el 'else' que ponía "Sin acciones".

    return `
        <tr data-appointment-id="${appointment.id}" class="block md:table-row">
            
            <td class="p-4 flex justify-between items-center border-t md:border-t-0 md:table-cell md:px-6 md:py-4">
                <span class="font-bold text-sm text-gray-600 md:hidden">Cliente:</span>
                <div class="text-right md:text-left">
                    <div class="text-sm font-medium text-gray-900">${ownerName}</div>
                    <div class="text-sm text-gray-500">${petName}</div>
                </div>
            </td>

            <td class="p-4 flex justify-between items-center border-t md:border-t-0 md:table-cell md:px-6 md:py-4">
                <span class="font-bold text-sm text-gray-600 md:hidden">Fecha:</span>
                <div class="text-right md:text-left">
                    <div class="text-sm font-medium text-gray-900">${appointment.appointment_date}</div>
                    <div class="text-sm text-gray-500">${appointment.appointment_time}</div>
                </div>
            </td>
            
            <td class="p-4 flex justify-between items-center border-t md:border-t-0 md:table-cell md:px-6 md:py-4">
                <span class="font-bold text-sm text-gray-600 md:hidden">Notas:</span>
                <p class="text-sm text-gray-700 truncate text-right md:text-left" title="${appointment.service}">${appointment.service}</p>
            </td>

            <td class="p-4 flex justify-between items-center border-t md:border-t-0 md:table-cell md:px-6 md:py-4">
                <span class="font-bold text-sm text-gray-600 md:hidden">Estado:</span>
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${currentStyle.bg} ${currentStyle.textColor}">${currentStyle.text}</span>
            </td>

            <td class="p-4 flex justify-between items-center border-t md:border-t-0 md:table-cell md:px-6 md:py-4 md:text-center">
                <span class="font-bold text-sm text-gray-600 md:hidden">Acciones:</span>
                <div class="flex items-center justify-end gap-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
    `;
};

// ... (mantén el resto del archivo como está, incluyendo el export) ...
export { 
    createUpcomingAppointmentItem, 
    createClientRow, 
    createProductRow, 
    createAppointmentRow 
};