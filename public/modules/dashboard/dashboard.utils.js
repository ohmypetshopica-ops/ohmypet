// public/modules/dashboard/dashboard.utils.js
// VERSIÓN COMPLETA Y FINAL

const createUpcomingAppointmentItem = (appointment) => {
    const petName = appointment.pets?.name || 'N/A';
    const petImage = appointment.pets?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(petName)}&background=A4D0A4&color=FFFFFF`;
    const ownerProfile = appointment.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'N/A';
    const dateParts = appointment.appointment_date.split('-');
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const formattedDate = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
            <div>
                <p class="font-bold text-green-700">${formattedDate} - ${appointment.appointment_time}</p>
                <p class="text-sm text-gray-600">Mascota: <span class="font-medium">${petName}</span> (Dueño: ${ownerName})</p>
            </div>
            <a href="/public/modules/dashboard/dashboard-appointments.html" class="text-sm font-medium text-green-600 hover:text-green-800">Ver</a>
        </div>
    `;
};

const createClientRow = (client) => {
    const displayName = (client.first_name && client.last_name) 
        ? `${client.first_name} ${client.last_name}` 
        : client.full_name || 'Sin nombre';
    const avatarUrl = client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=A4D0A4&color=FFFFFF`;
    const phone = client.phone ? `<a href="https://wa.me/51${client.phone}" target="_blank" class="text-green-600 hover:underline">${client.phone}</a>` : 'N/A';

    return `
        <tr class="hover:bg-gray-50 cursor-pointer" data-client-id="${client.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img src="${avatarUrl}" alt="Avatar" class="h-10 w-10 rounded-full object-cover">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${displayName}</div>
                        <div class="text-sm text-gray-500">${client.email || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${phone}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button class="text-indigo-600 hover:text-indigo-900 view-client-btn">Ver Detalles</button>
            </td>
        </tr>
    `;
};

const createProductRow = (product) => {
    const imageUrl = product.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=D1D5DB&color=FFFFFF`;
    const productData = JSON.stringify({ id: product.id, name: product.name, description: product.description, price: product.price, stock: product.stock, image_url: product.image_url }).replace(/"/g, '&quot;');

    return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img src="${imageUrl}" alt="${product.name}" class="h-12 w-12 rounded object-cover">
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${product.name}</div>
                        <div class="text-sm text-gray-500">${product.description || 'Sin descripción'}</div>
                    </div>
                </div>
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
    
    let actionButtons = '';
    if (status === 'pendiente') {
        actionButtons = `<button data-action="confirmar" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors">Confirmar</button>
                         <button data-action="rechazar" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors">Rechazar</button>`;
    } else if (status === 'confirmada') {
        actionButtons = `<button data-action="completar" class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors">Completar</button>`;
    } else {
        actionButtons = `<span class="text-xs text-gray-400">Sin acciones</span>`;
    }

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
    const petName = service.pets?.name || 'N/A';
    const ownerProfile = service.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name)
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
        : ownerProfile?.full_name || 'N/A';

    return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${ownerName}</div>
                <div class="text-sm text-gray-500">${petName}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                ${service.appointment_date}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">
                S/ ${(service.service_price || 0).toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${service.payment_method || 'N/A'}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600 max-w-sm truncate" title="${service.final_observations || ''}">
                ${service.final_observations || 'Sin observaciones.'}
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