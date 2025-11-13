// public/modules/dashboard/dashboard.utils.js

const createUpcomingAppointmentItem = (appointment) => {
    const petName = appointment.pets?.name || 'Mascota';
    const ownerProfile = appointment.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Dueño';
    
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    const appointmentTime = appointment.appointment_time ? appointment.appointment_time.slice(0, 5) : 'Hora no especificada';

    return `
        <div class="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div class="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">${petName}</p>
                <p class="text-xs text-gray-600">${ownerName}</p>
                <p class="text-xs text-gray-500">${appointmentDate} a las ${appointmentTime}</p>
            </div>
        </div>
    `;
};

const createClientRow = (client) => {
    const displayName = (client.first_name && client.last_name) 
        ? `${client.first_name} ${client.last_name}` 
        : client.full_name || 'Sin nombre';
    const avatarUrl = client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=A4D0A4&color=FFFFFF`;
    const phone = client.phone || 'Sin teléfono';
    const petsCount = client.pets_count || 0;
    
    let lastAppointmentText = 'Sin citas';
    if (client.last_appointment_date) {
        const date = new Date(client.last_appointment_date);
        lastAppointmentText = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    return `
        <tr class="hover:bg-gray-50 cursor-pointer" data-client-id="${client.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img src="${avatarUrl}" alt="Avatar" class="h-10 w-10 rounded-full object-cover">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${displayName}</div>
                        <div class="text-sm text-gray-500">${phone}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                ${petsCount} ${petsCount === 1 ? 'mascota' : 'mascotas'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${lastAppointmentText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button class="text-indigo-600 hover:text-indigo-900 view-details-btn" data-client-id="${client.id}">Ver Detalles</button>
            </td>
        </tr>
    `;
};

const createProductRow = (product) => {
    const imageUrl = product.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=D1D5DB&color=FFFFFF`;
    const productData = JSON.stringify({ id: product.id, name: product.name, description: product.description, category: product.category, price: product.price, stock: product.stock, image_url: product.image_url }).replace(/"/g, '&quot;');

    return `
        <tr class="hover:bg-gray-50" data-product-id="${product.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img src="${imageUrl}" alt="${product.name}" class="h-12 w-12 rounded object-cover">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${product.name}</div>
                        <div class="text-sm text-gray-500">${product.description || 'Sin descripción'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${product.category || 'Sin categoría'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">
                S/ ${product.price.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.stock} en Stock
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <div class="flex items-center justify-center space-x-4">
                    <button data-action="edit" data-product='${productData}' class="text-indigo-600 hover:text-indigo-900">Editar</button>
                    <button data-action="delete" data-product='${productData}' class="text-red-600 hover:text-red-900">Eliminar</button>
                </div>
            </td>
        </tr>
    `;
};

const createAppointmentRow = (appointment) => {
    const petName = appointment.pets?.name || 'N/A';
    const petImage = appointment.pets?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(petName)}&background=A4D0A4&color=FFFFFF`;
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
    
    // --- INICIO: CÓDIGO ACTUALIZADO ---
    let actionButtons = '';
    if (status === 'pendiente') {
        actionButtons = `
            <button data-action="confirmar" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors">Confirmar</button>
            <button data-action="reprogramar" class="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition-colors">Editar</button>
            <button data-action="eliminar" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors">Eliminar</button>
        `;
    } else if (status === 'confirmada') {
        actionButtons = `
            <button data-action="completar" class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors">Completar</button>
            <button data-action="reprogramar" class="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition-colors">Editar</button>
            <button data-action="eliminar" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors">Eliminar</button>
        `;
    } else if (status === 'completada') {
        actionButtons = `<span class="text-xs text-gray-500 font-medium">Finalizada</span>`;
    } else {
        // Para 'cancelada' y 'rechazada'
        actionButtons = `
            <span class="text-xs text-gray-400">Sin acciones</span>
            <button data-action="eliminar" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors">Eliminar</button>
        `;
    }
    // --- FIN: CÓDIGO ACTUALIZADO ---

    return `
        <tr data-appointment-id="${appointment.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img src="${petImage}" alt="${petName}" class="h-10 w-10 rounded-full object-cover">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${petName}</div>
                        <div class="text-sm text-gray-500">${ownerName}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${appointment.appointment_date}</div>
                <div class="text-sm text-gray-500">${appointment.appointment_time}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate" title="${appointment.service || ''}">
                ${appointment.service || 'Sin notas'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${currentStyle.bg} ${currentStyle.textColor}">${currentStyle.text}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <div class="flex items-center justify-center gap-2">${actionButtons}</div>
            </td>
        </tr>
    `;
};

const createServiceHistoryRow = (service) => {
    const ownerProfile = service.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'Sin cliente';

    const petName = service.pets?.name || 'Sin mascota';
    
    // **** INICIO DE LA CORRECCIÓN ****
    // Forzar mayúsculas en la visualización para consistencia
    const paymentMethod = (service.payment_method || 'N/A').toUpperCase();
    // **** FIN DE LA CORRECCIÓN ****
    
    const cost = service.service_price ? `S/ ${service.service_price.toFixed(2)}` : 'N/A';

    return `
        <tr class="hover:bg-gray-50" data-appointment-id="${service.id}">
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-gray-900">${ownerName}</div>
                <div class="text-sm text-gray-500">${petName}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900">${new Date(service.appointment_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                <div class="text-sm text-gray-500">${service.appointment_time}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700">${service.service || 'Servicio general'}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700">${paymentMethod}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm font-semibold text-gray-900">${cost}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <button data-action="edit-service" class="text-blue-600 hover:text-blue-900 font-semibold view-service-btn">
                    Ver Detalles
                </button>
            </td>
        </tr>
    `;
};


export { 
    createUpcomingAppointmentItem, 
    createClientRow, 
    createProductRow, 
    createAppointmentRow,
    createServiceHistoryRow
};