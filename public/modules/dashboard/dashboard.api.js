// public/modules/dashboard/dashboard.api.js
// VERSIÓN FINAL, COMPLETA Y CORREGIDA

import { supabase } from '../../core/supabase.js';

// --- STATS GENERALES ---
export const getDashboardStats = async () => {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        return { clients: 0, pets: 0, appointments: 0, products: 0 };
    }
    return data;
};

export const getUpcomingAppointments = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
        .from('appointments')
        .select(`*, pets ( name ), profiles ( full_name, first_name, last_name )`)
        .eq('status', 'confirmada')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);
    if (error) console.error('Error al obtener próximas citas:', error);
    return data || [];
};

// --- CLIENTES ---
export const getClients = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, role')
        .eq('role', 'cliente')
        .order('full_name', { ascending: true });
    if (error) console.error('Error al obtener los clientes:', error);
    return data || [];
};

export const searchClients = async (searchTerm) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, role')
        .eq('role', 'cliente')
        .ilike('full_name', `%${searchTerm}%`);
    if (error) console.error('Error al buscar clientes:', error);
    return data || [];
};

// --- CITAS ---
export const getAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`)
        .order('created_at', { ascending: false });
    if (error) console.error('Error al obtener citas:', error);
    return data || [];
};

export const updateAppointmentStatus = async (appointmentId, newStatus) => {
    const { data, error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)
        .select();
    if (error) {
        console.error('Error al actualizar estado de la cita:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

// --- PRODUCTOS ---
export const getProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (error) console.error('Error al obtener productos:', error);
    return data || [];
};

export const addProduct = async (productData) => {
    const { error } = await supabase.from('products').insert([productData]);
    if (error) {
        console.error('Error al agregar producto:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const updateProduct = async (productId, productData) => {
    const { error } = await supabase.from('products').update(productData).eq('id', productId);
    if (error) {
        console.error('Error al actualizar producto:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const deleteProduct = async (productId) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
        console.error('Error al eliminar producto:', error);
        return { success: false, error };
    }
    return { success: true };
};

// --- SERVICIOS ---
export const getServices = async () => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) console.error('Error al obtener servicios:', error);
    return data || [];
};

// --- FOTOS DE CITAS (NUEVAS FUNCIONES) ---
export const getAppointmentPhotos = async (appointmentId) => {
    const { data, error } = await supabase
        .from('appointment_photos')
        .select('photo_type, image_url')
        .eq('appointment_id', appointmentId);
    
    if (error) {
        console.error('Error al obtener las fotos de la cita:', error);
        return [];
    }
    return data;
};

export const uploadAppointmentPhoto = async (appointmentId, file, photoType) => {
    if (!file) return { success: false, error: { message: 'No se proporcionó ningún archivo.' } };

    const fileName = `public/${appointmentId}-${photoType}-${Date.now()}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('appointment_images')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        console.error('Error al subir la imagen:', uploadError);
        return { success: false, error: uploadError };
    }

    const { data: { publicUrl } } = supabase.storage
        .from('appointment_images')
        .getPublicUrl(fileName);

    const { data: dbData, error: dbError } = await supabase
        .from('appointment_photos')
        .upsert({
            appointment_id: appointmentId,
            photo_type: photoType,
            image_url: publicUrl
        }, { onConflict: 'appointment_id, photo_type' })
        .select();

    if (dbError) {
        console.error('Error al guardar la URL en la base de datos:', dbError);
        return { success: false, error: dbError };
    }

    return { success: true, data: dbData[0] };
};