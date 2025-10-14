import { supabase } from '../../core/supabase.js';

// Optimizado: No necesita columnas, solo contar. head: true es eficiente.
export const getClientCount = async () => {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'cliente');
    if (error) console.error('Error al contar clientes:', error);
    return count || 0;
};

// ... (las funciones de conteo ya son eficientes)

// Optimizado: Solo trae las columnas necesarias para la lista de "Próximas Citas"
export const getUpcomingAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, 
            appointment_date, 
            appointment_time, 
            service, 
            status, 
            pets ( name ), 
            profiles ( full_name, first_name, last_name )
        `)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);
    if (error) console.error('Error al obtener próximas citas:', error);
    return data || [];
};

// Optimizado: Solo trae las columnas para la tabla de clientes.
export const getClients = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, role')
        .eq('role', 'cliente')
        .order('full_name', { ascending: true });
    if (error) console.error('Error al obtener clientes:', error);
    return data || [];
};

// Optimizado: Solo trae las columnas necesarias para la búsqueda.
export const searchClients = async (searchTerm) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, role')
        .eq('role', 'cliente')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    if (error) console.error('Error al buscar clientes:', error);
    return data || [];
};

// Optimizado: Traemos las columnas justas para la tabla de citas y el modal.
export const getAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, 
            appointment_date, 
            appointment_time, 
            service, 
            status, 
            final_observations, 
            final_weight, 
            invoice_pdf_url, 
            pet_id, 
            pets ( name ), 
            profiles ( full_name, first_name, last_name )
        `)
        .order('created_at', { ascending: false });
    if (error) console.error('Error al obtener citas:', error);
    return data || [];
};

// ... (updateAppointmentStatus es una actualización, no necesita cambios)

// Optimizado: El filtro ya estaba bien definido, sin select('*').
export const filterAppointments = async (filters) => {
    let query = supabase.from('appointments').select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.date) query = query.eq('appointment_date', filters.date);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) console.error('Error al filtrar citas:', error);
    return data || [];
};

// Optimizado: Trae todas las columnas porque el modal de edición las necesita. En este caso está bien.
export const getProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (error) console.error('Error al obtener productos:', error);
    return data || [];
};

// ... (el resto de funciones son de inserción, actualización o eliminación, no necesitan cambios)

// Optimizado: Trae todas las columnas para el modal de edición de servicios.
export const getServices = async () => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) console.error('Error al obtener servicios:', error);
    return data || [];
};

// ... (el resto de las funciones de este archivo están bien)

export { supabase };

// (Incluye el resto de funciones que ya tenías en el archivo como getAppointmentPhotos, uploadAppointmentPhoto, etc. Esas no necesitan cambios.)