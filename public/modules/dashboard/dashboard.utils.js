// public/modules/dashboard/dashboard.utils.js

/**
 * Genera el HTML para una fila de la tabla de productos.
 * @param {Object} product - El objeto producto con los datos.
 * @returns {string} El HTML de la fila de la tabla.
 */
const createProductRow = (product) => {
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <img class="h-10 w-10 rounded-full" src="${product.image_url || 'https://via.placeholder.com/40'}" alt="">
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

/**
 * Genera el HTML para una fila de la tabla de servicios.
 * @param {Object} service - El objeto servicio con los datos.
 * @returns {string} El HTML de la fila de la tabla.
 */
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

/**
 * Genera el HTML para una fila de la tabla de citas.
 * @param {Object} appointment - El objeto cita con los datos.
 * @returns {string} El HTML de la fila de la tabla.
 */
const createAppointmentRow = (appointment) => {
    const serviceName = appointment.services?.name || 'Servicio no disponible';
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

export { createProductRow, createServiceRow, createAppointmentRow };