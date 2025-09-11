// public/modules/dashboard/dashboard.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene el conteo total de clientes de la tabla 'profiles'.
 * @returns {Promise<number>} El conteo de clientes.
 */
const getClientCount = async () => {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error al obtener el conteo de clientes:', error);
        return 0;
    }
    return count;
};

/**
 * Obtiene el conteo total de mascotas de la tabla 'pets'.
 * @returns {Promise<number>} El conteo de mascotas.
 */
const getPetCount = async () => {
    const { count, error } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error al obtener el conteo de mascotas:', error);
        return 0;
    }
    return count;
};

/**
 * Obtiene todos los productos de la tabla 'products'.
 * @returns {Promise<Array<Object>>} Lista de productos.
 */
const getProducts = async () => {
    const { data, error } = await supabase
        .from('products')
        .select('*');

    if (error) {
        console.error('Error al obtener productos:', error);
        return [];
    }
    return data;
};

/**
 * Obtiene todos los servicios de la tabla 'services'.
 * @returns {Promise<Array<Object>>} Lista de servicios.
 */
const getServices = async () => {
    const { data, error } = await supabase
        .from('services')
        .select('*');

    if (error) {
        console.error('Error al obtener servicios:', error);
        return [];
    }
    return data;
};

/**
 * Obtiene todas las citas, incluyendo datos relacionados de mascotas y perfiles.
 * @returns {Promise<Array<Object>>} Lista de citas.
 */
const getAppointments = async () => {
    // --- CORRECCIÓN APLICADA ---
    // Se eliminó la conexión a 'services' y el '.order()' que causaban el error.
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            pets ( name ),
            profiles ( full_name )
        `);

    if (error) {
        console.error('Error al obtener citas:', error);
        return [];
    }
    return data;
};

export { getClientCount, getPetCount, getProducts, getServices, getAppointments };