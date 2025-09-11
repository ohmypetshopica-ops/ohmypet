// public/modules/dashboard/dashboard.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene el conteo total de clientes.
 */
const getClientCount = async () => {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (error) {
        console.error('Error al obtener el conteo de clientes:', error);
        return 0;
    }
    return count;
};

/**
 * Obtiene el conteo total de mascotas.
 */
const getPetCount = async () => {
    const { count, error } = await supabase.from('pets').select('*', { count: 'exact', head: true });
    if (error) {
        console.error('Error al obtener el conteo de mascotas:', error);
        return 0;
    }
    return count;
};

/**
 * Obtiene todos los productos.
 */
const getProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
        console.error('Error al obtener productos:', error);
        return [];
    }
    return data;
};

/**
 * Obtiene todos los servicios.
 */
const getServices = async () => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) {
        console.error('Error al obtener servicios:', error);
        return [];
    }
    return data;
};

/**
 * Obtiene todas las citas con datos relacionados.
 */
const getAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`*, pets ( name ), profiles ( full_name )`);
    if (error) {
        console.error('Error al obtener citas:', error);
        return [];
    }
    return data;
};

/**
 * Inserta un nuevo producto en la base de datos.
 * @param {Object} productData - Los datos del nuevo producto.
 * @returns {Promise<Object>} El resultado de la inserción.
 */
const addProduct = async (productData) => {
    const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select(); // .select() devuelve el registro insertado

    if (error) {
        console.error('Error al agregar el producto:', error);
        return { success: false, error };
    }
    return { success: true, data };
};

export { getClientCount, getPetCount, getProducts, getServices, getAppointments, addProduct };