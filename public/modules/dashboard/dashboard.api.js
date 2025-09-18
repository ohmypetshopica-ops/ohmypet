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
    const { count, error } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pendiente');
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
    const { data, error } = await supabase.from('appointments').select(`*, pets ( name ), profiles ( full_name, first_name, last_name )`).eq('status', 'confirmada').gte('appointment_date', today).order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true }).limit(5);
    if (error) console.error('Error al obtener próximas citas:', error);
    return data || [];
};
const getClients = async () => {
    const { data, error } = await supabase.from('profiles').select('full_name, first_name, last_name, role').eq('role', 'cliente');
    if (error) console.error('Error al obtener los clientes:', error);
    return data || [];
};
const searchClients = async (searchTerm) => {
    const { data, error } = await supabase.from('profiles').select('full_name, first_name, last_name, role').eq('role', 'cliente').ilike('full_name', `%${searchTerm}%`);
    if (error) console.error('Error al buscar clientes:', error);
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
    const { data, error } = await supabase.from('appointments').select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`).order('appointment_date', { ascending: false });
    if (error) console.error('Error al obtener citas:', error);
    return data || [];
};

const filterAppointments = async (filters) => {
    let query = supabase
        .from('appointments')
        .select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.date) query = query.eq('appointment_date', filters.date);
    const { data, error } = await query.order('appointment_date', { ascending: false });
    if (error) {
        console.error('Error al filtrar citas:', error);
        return [];
    }
    return data || [];
};

// --- FUNCIONES CRUD PARA PRODUCTOS ---
const addProduct = async (productData) => {
    const { data, error } = await supabase.from('products').insert([productData]).select();
    if (error) return { success: false, error };
    return { success: true, data };
};
const updateProduct = async (productId, productData) => {
    const { data, error } = await supabase.from('products').update(productData).eq('id', productId).select();
    if (error) return { success: false, error };
    return { success: true, data };
};
const deleteProduct = async (productId) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) return { success: false, error };
    return { success: true };
};

// --- FUNCIONES CRUD PARA SERVICIOS ---
const addService = async (serviceData) => {
    const { data, error } = await supabase.from('services').insert([serviceData]).select();
    if (error) return { success: false, error };
    return { success: true, data };
};
const updateService = async (serviceId, serviceData) => {
    const { data, error } = await supabase.from('services').update(serviceData).eq('id', serviceId).select();
    if (error) return { success: false, error };
    return { success: true, data };
};
const deleteService = async (serviceId) => {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) return { success: false, error };
    return { success: true };
};

// --- OTRAS FUNCIONES ---
const updateAppointmentStatus = async (appointmentId, newStatus) => {
    const { data, error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId).select();
    if (error) return { success: false, error };
    return { success: true, data: data[0] };
};

export {
    getClientCount, getPetCount, getAppointmentsCount, getProductsCount,
    getUpcomingAppointments, getClients, searchClients, getProducts, getServices,
    getAppointments, addProduct, updateAppointmentStatus,
    filterAppointments,
    updateProduct, deleteProduct,
    addService, updateService, deleteService
};