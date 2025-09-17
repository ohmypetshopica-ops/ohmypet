// public/modules/dashboard/dashboard.utils.js

/**
 * Genera el HTML para un item de la lista de próximas citas.
 * @param {Object} appointment - La cita.
 * @returns {string} El HTML del item.
 */
const createUpcomingAppointmentItem = (appointment) => {
    const petName = appointment.pets?.name || 'N/A';
    const ownerName = appointment.profiles?.full_name || 'N/A';
    
    // Formatear la fecha para que sea más legible
    const date = new Date(appointment.appointment_date + 'T00:00:00-05:00'); // Asumir zona horaria local
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
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${client.full_name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${client.role}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="#" class="text-green-600 hover:text-green-900">Ver Detalles</a>
            </td>
        </tr>
    `;
};

const createProductRow = (product) => {
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <img class="h-10 w-10 rounded-full" src="${product.image_url || 'https://via.placeholder.com/40'}" alt="Imagen del producto">
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${product.name}</div>
                        <div class="text-sm text-gray-500">${product.description || 'Sin descripción'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">$${product.price}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.stock > 0 ? 'En Stock' : 'Sin Stock'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="#" class="text-green-600 hover:text-green-900">Editar</a>
            </td>
        </tr>
    `;
};

const createServiceRow = (service) => {
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${service.name}</div>
                <div class="text-sm text-gray-500">${service.description || 'Sin descripción'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">$${service.price}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${service.duration_minutes} min
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="#" class="text-green-600 hover:text-green-900">Editar</a>
            </td>
        </tr>
    `;
};

const createAppointmentRow = (appointment) => {
    const serviceName = appointment.service || 'Servicio no especificado';
    const petName = appointment.pets?.name || 'Mascota no disponible';
    const ownerName = appointment.profiles?.full_name || 'Dueño no disponible';

    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${appointment.appointment_date}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${appointment.appointment_time}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${serviceName}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${petName}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${ownerName}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href="#" class="text-green-600 hover:text-green-900">Ver detalles</a>
            </td>
        </tr>
    `;
};

export { createUpcomingAppointmentItem, createClientRow, createProductRow, createServiceRow, createAppointmentRow };