// public/modules/dashboard/dashboard.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene todas las estadísticas del dashboard en una sola llamada a la base de datos.
 * Utiliza una función RPC (Remote Procedure Call) de Supabase.
 */
export const getDashboardStats = async () => {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        return { clients: 0, pets: 0, appointments: 0, products: 0 };
    }
    return data;
};

// --- EL RESTO DE FUNCIONES SE MANTIENEN IGUAL ---

export const getUpcomingAppointments = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from('appointments').select(`*, pets ( name ), profiles ( full_name, first_name, last_name )`).eq('status', 'confirmada').gte('appointment_date', today).order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true }).limit(5);
    if (error) console.error('Error al obtener próximas citas:', error);
    return data || [];
};

export const getClients = async () => {
    const { data, error } = await supabase.from('profiles').select('full_name, first_name, last_name, role').eq('role', 'cliente');
    if (error) console.error('Error al obtener los clientes:', error);
    return data || [];
};

export const searchClients = async (searchTerm) => {
    const { data, error } = await supabase.from('profiles').select('full_name, first_name, last_name, role').eq('role', 'cliente').ilike('full_name', `%${searchTerm}%`);
    if (error) console.error('Error al buscar clientes:', error);
    return data || [];
};

export const getProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) console.error('Error al obtener productos:', error);
    return data || [];
};

export const getServices = async () => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) console.error('Error al obtener servicios:', error);
    return data || [];
};

export const getAppointments = async () => {
    const { data, error } = await supabase.from('appointments').select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`).order('appointment_date', { ascending: false });
    if (error) console.error('Error al obtener citas:', error);
    return data || [];
};

export const filterAppointments = async (filters) => {
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

// ... (El resto de las funciones CRUD para productos y servicios se mantienen igual)