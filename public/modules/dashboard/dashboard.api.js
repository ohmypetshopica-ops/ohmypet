import { supabase } from '../../core/supabase.js';

/**
 * Obtiene todas las estadísticas del dashboard en una sola llamada RPC.
 * @returns {Promise<Object>} Un objeto con los conteos de clientes, mascotas, citas y productos.
 */
export const getDashboardStats = async () => {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        return { clients: 0, pets: 0, appointments: 0, products: 0 };
    }
    // La RPC devuelve un array con un solo objeto, lo extraemos.
    return data[0];
};

/**
 * Obtiene las próximas 5 citas pendientes o confirmadas.
 * @returns {Promise<Array<Object>>} Lista de próximas citas.
 */
export const getUpcomingAppointments = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, 
            appointment_date, 
            appointment_time, 
            pets ( name ), 
            profiles ( full_name, first_name, last_name )
        `)
        .in('status', ['pendiente', 'confirmada'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);

    if (error) {
        console.error('Error al obtener próximas citas:', error);
        return [];
    }
    return data || [];
};

// El resto de las funciones de la API (getClientes, getProducts, etc.) permanecen aquí
// para ser usadas por sus respectivas secciones.

export const getClients = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'cliente').order('full_name', { ascending: true });
    if (error) console.error('Error al obtener clientes:', error);
    return data || [];
};

export const searchClients = async (searchTerm) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'cliente').or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    if (error) console.error('Error al buscar clientes:', error);
    return data || [];
};

export const getAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`id, appointment_date, appointment_time, service, status, final_observations, final_weight, invoice_pdf_url, pet_id, service_price, payment_method, pets ( name ), profiles ( full_name, first_name, last_name )`)
        .order('created_at', { ascending: false });
    if (error) console.error('Error al obtener citas:', error);
    return data || [];
};

export const getCompletedAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`*, pets(name), profiles(full_name, first_name, last_name)`)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false });
    if (error) {
        console.error('Error al obtener servicios completados:', error);
        return [];
    }
    return data || [];
};

export const updateAppointmentStatus = async (appointmentId, newStatus, details = {}) => {
    const updateData = {
        status: newStatus,
        final_observations: details.observations,
        final_weight: details.weight,
        service_price: details.price,
        payment_method: details.paymentMethod
    };

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select();
        
    if (error) {
        console.error('Error al actualizar estado de la cita:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

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
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
        console.error('Error al subir la imagen:', uploadError);
        return { success: false, error: uploadError };
    }

    const { data: { publicUrl } } = supabase.storage.from('appointment_images').getPublicUrl(fileName);

    const { data: dbData, error: dbError } = await supabase
        .from('appointment_photos')
        .upsert({ appointment_id: appointmentId, photo_type: photoType, image_url: publicUrl }, { onConflict: 'appointment_id, photo_type' })
        .select();

    if (dbError) {
        console.error('Error al guardar la URL en la base de datos:', dbError);
        return { success: false, error: dbError };
    }
    return { success: true, data: dbData[0] };
};

export const uploadReceiptFile = async (appointmentId, file) => {
    if (!file) return { success: false, error: { message: 'No se proporcionó ningún archivo.' } };

    const fileExtension = file.name.split('.').pop();
    const fileName = `public/${appointmentId}-receipt-${Date.now()}.${fileExtension}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
        console.error('Error al subir la boleta:', uploadError);
        return { success: false, error: uploadError };
    }

    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

    const { error: dbError } = await supabase
        .from('appointments')
        .update({ invoice_pdf_url: publicUrl })
        .eq('id', appointmentId);

    if (dbError) {
        console.error('Error al guardar la URL de la boleta:', dbError);
        return { success: false, error: dbError };
    }
    return { success: true, url: publicUrl };
};