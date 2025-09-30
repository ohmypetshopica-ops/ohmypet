// public/modules/dashboard/dashboard.utils.js

const createUpcomingAppointmentItem = (appointment) => {
    const petName = appointment.pets?.name || 'N/A';
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
            <a href="#appointments" class="text-sm font-medium text-green-600 hover:text-green-800">Ver</a>
        </div>
    `;
};

const createClientRow = (client) => {
    const displayName = (client.first_name && client.last_name) 
        ? `${client.first_name} ${client.last_name}` 
        : client.full_name;
    return `
        <tr>
            <td class="px-6 py-4"><div class="text-sm font-medium text-gray-900">${displayName}</div></td>
            <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">${client.role}</span></td>
            <td class="px-6 py-4 text-right text-sm font-medium"><a href="#" class="text-green-600 hover:text-green-900">Ver Detalles</a></td>
        </tr>
    `;
};

const createProductRow = (product) => {
    const productData = JSON.stringify(product).replace(/"/g, '&quot;');
    return `
        <tr data-product-id="${product.id}">
            <td class="px-6 py-4 whitespace-nowrap"><div class="flex items-center"><div class="flex-shrink-0 h-10 w-10"><img class="h-10 w-10 rounded-full" src="${product.image_url || 'https://via.placeholder.com/40'}" alt="${product.name}"></div><div class="ml-4"><div class="text-sm font-medium text-gray-900">${product.name}</div><div class="text-sm text-gray-500">${product.description || 'Sin descripción'}</div></div></div></td>
            <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">$${product.price}</div></td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${product.stock} en Stock</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div class="flex items-center justify-end space-x-2"><button data-action="edit" data-product='${productData}' class="text-indigo-600 hover:text-indigo-900">Editar</button><button data-action="delete" class="text-red-600 hover:text-red-900">Eliminar</button></div></td>
        </tr>
    `;
};

const createServiceRow = (service) => {
    const serviceData = JSON.stringify(service).replace(/"/g, '&quot;');
    return `
        <tr data-service-id="${service.id}">
            <td class="px-6 py-4"><div class="text-sm font-medium text-gray-900">${service.name}</div><div class="text-sm text-gray-500">${service.description || 'Sin descripción'}</div></td>
            <td class="px-6 py-4"><div class="text-sm text-gray-900">$${service.price}</div></td>
            <td class="px-6 py-4 text-sm text-gray-500">${service.duration_minutes} min</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div class="flex items-center justify-end space-x-2"><button data-action="edit" data-service='${serviceData}' class="text-indigo-600 hover:text-indigo-900">Editar</button><button data-action="delete" class="text-red-600 hover:text-red-900">Eliminar</button></div></td>
        </tr>
    `;
};

const createAppointmentRow = (appointment) => {
    const petName = appointment.pets?.name || 'N/A';
    const ownerProfile = appointment.profiles;
    const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
        ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
        : ownerProfile?.full_name || 'N/A';
    const status = (appointment.status || 'pendiente').toLowerCase().trim();
    const statusStyles = { pendiente: { text: 'Pendiente', bg: 'bg-yellow-100', text_color: 'text-yellow-800' }, confirmada: { text: 'Confirmada', bg: 'bg-blue-100', text_color: 'text-blue-800' }, completada: { text: 'Completada', bg: 'bg-green-100', text_color: 'text-green-800' }, rechazada: { text: 'Rechazada', bg: 'bg-red-100', text_color: 'text-red-800' } };
    const currentStyle = statusStyles[status] || statusStyles.pendiente;
    let actionButtons = '';
    if (status === 'pendiente') {
        actionButtons = `<button data-action="confirmar" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Confirmar</button> <button data-action="rechazar" class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Rechazar</button>`;
    } else if (status === 'confirmada') {
        actionButtons = `<button data-action="completar" class="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Completar</button>`;
    }
    return `
        <tr data-appointment-id="${appointment.id}">
            <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">${appointment.appointment_date}</div><div class="text-sm text-gray-500">${appointment.appointment_time}</div></td>
            <td class="px-6 py-4"><div class="text-sm font-medium text-gray-900">${ownerName}</div><div class="text-sm text-gray-500">${petName}</div></td>
            <td class="px-6 py-4 text-sm text-gray-700">${appointment.service}</td>
            <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${currentStyle.bg} ${currentStyle.text_color}">${currentStyle.text}</span></td>
            <td class="px-6 py-4 text-right text-sm font-medium"><div class="flex flex-col sm:flex-row gap-1 justify-end">${actionButtons}</div></td>
        </tr>
    `;
};

export { createUpcomingAppointmentItem, createClientRow, createProductRow, createServiceRow, createAppointmentRow };