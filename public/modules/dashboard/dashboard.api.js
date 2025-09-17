// public/modules/dashboard/dashboard.api.js

import { supabase } from '../../core/supabase.js';

// --- FUNCIONES PARA LOS CONTEOS DEL RESUMEN ---

const getClientCount = async () => {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'cliente');
    if (error) console.error('Error en getClientCount:', error);
    return count || 0;
};

const getPetCount = async () => {
    const { count, error } = await supabase.from('pets').select('*', { count: 'exact', head: true });
    if (error) console.error('Error en getPetCount:', error);
    return count || 0;
};

const getAppointmentsCount = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { count, error } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('appointment_date', today);
    if (error) console.error('Error en getAppointmentsCount:', error);
    return count || 0;
};

const getProductsCount = async () => {
    const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (error) console.error('Error en getProductsCount:', error);
    return count || 0;
};


// --- FUNCIONES PARA LAS LISTAS Y BÚSQUEDA ---

const getUpcomingAppointments = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
        .from('appointments')
        .select(`*, pets ( name ), profiles ( full_name )`)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);

    if (error) {
        console.error('Error al obtener próximas citas:', error);
        return [];
    }
    return data;
};

const getClients = async () => {
    const { data, error } = await supabase.from('profiles').select('full_name, role').eq('role', 'cliente');
    if (error) console.error('Error al obtener los clientes:', error);
    return data || [];
};

/**
 * NUEVA FUNCIÓN: Busca clientes por nombre.
 * @param {string} searchTerm - El texto a buscar.
 * @returns {Promise<Array<Object>>} La lista de clientes que coinciden.
 */
const searchClients = async (searchTerm) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('role', 'cliente')
        .ilike('full_name', `%${searchTerm}%`); // Busca coincidencias parciales

    if (error) {
        console.error('Error al buscar clientes:', error);
        return [];
    }
    return data || [];
};

const getProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) console.error('Error al obtener productos:', error);
    return data || [];
};

const getServices = async () => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) console.error('Error al obtener servicios:', error);
    return data || [];
};

const getAppointments = async () => {
    const { data, error } = await supabase.from('appointments').select(`*, pets ( name ), profiles ( full_name )`);
    if (error) console.error('Error al obtener citas:', error);
    return data || [];
};

const addProduct = async (productData) => {
    const { data, error } = await supabase.from('products').insert([productData]).select();
    if (error) {
        console.error('Error al agregar el producto:', error);
        return { success: false, error };
    }
    return { success: true, data };
};

export {
    getClientCount,
    getPetCount,
    getAppointmentsCount,
    getProductsCount,
    getUpcomingAppointments,
    getClients,
    searchClients, // <-- Exportamos la nueva función
    getProducts,
    getServices,
    getAppointments,
    addProduct
};