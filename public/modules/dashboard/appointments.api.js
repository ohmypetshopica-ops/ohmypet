// public/modules/dashboard/appointments.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene el conteo de CITAS PENDIENTES solamente.
 * CORRECCIÓN: Antes contaba todas, ahora filtra por status 'pendiente'.
 */
export const getAppointmentsCount = async () => {
    const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendiente'); // <--- FILTRO AGREGADO
    
    if (error) console.error('Error al contar citas:', error);
    return count || 0;
};

/**
 * Obtiene las citas pendientes para las notificaciones (lista).
 */
export const getPendingAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            appointment_time,
            pets ( name ),
            profiles ( first_name, last_name, full_name )
        `)
        .eq('status', 'pendiente')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

    if (error) {
        console.error("Error al obtener citas pendientes:", error);
        return [];
    }
    return data;
};

/**
 * Obtiene las próximas 5 citas (pendientes o confirmadas) para el Dashboard.
 */
export const getUpcomingAppointments = async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    const { data, error } = await supabase
        .from('appointments')
        .select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`)
        .or(`appointment_date.gt.${today},and(appointment_date.eq.${today},appointment_time.gte.${currentTime})`)
        .in('status', ['pendiente', 'confirmada'])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);

    if (error) {
        console.error('Error al obtener próximas citas:', error);
    }
    return data || [];
};

/**
 * Obtiene citas paginadas con filtros.
 */
export const getAppointments = async (page = 1, itemsPerPage = 10, search = '', status = '', date = '') => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    let query = supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, status, final_observations, 
            final_weight, invoice_pdf_url, pet_id, service_price, payment_method, shampoo_type,
            client_name_denorm, pet_name_denorm,
            pets!inner ( name, image_url ), 
            profiles!inner ( full_name, first_name, last_name, phone )
        `, { count: 'exact' });
        
    if (search) {
        const searchTerm = `%${search}%`;
        // Busca en nombres denormalizados para mayor velocidad
        query = query.or(`pet_name_denorm.ilike."${searchTerm}",client_name_denorm.ilike."${searchTerm}"`);
    }
    
    if (status) {
        query = query.eq('status', status);
    }
    
    if (date) {
        query = query.eq('appointment_date', date);
    }
    
    query = query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
        console.error('Error al obtener citas:', error);
        return { data: [], count: 0 };
    }
    
    return { data: data || [], count: count || 0 };
};

/**
 * Agrega una nueva cita.
 */
export const addAppointmentFromDashboard = async (appointmentData) => {
    const [petRes, clientRes] = await Promise.all([
        supabase.from('pets').select('name').eq('id', appointmentData.pet_id).single(),
        supabase.from('profiles').select('first_name, last_name, full_name').eq('id', appointmentData.user_id).single()
    ]);

    const petName = petRes.data?.name || 'Mascota eliminada';
    const clientProfile = clientRes.data;
    const clientName = (clientProfile?.first_name && clientProfile?.last_name) 
        ? `${clientProfile.first_name} ${clientProfile.last_name}` 
        : clientProfile?.full_name || 'Cliente eliminado';

    const insertData = {
        ...appointmentData,
        pet_name_denorm: petName,
        client_name_denorm: clientName
    };
    
    const { data, error } = await supabase
        .from('appointments')
        .insert([insertData])
        .select();

    if (error) {
        console.error('Error al crear la cita:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

/**
 * Actualiza estado de cita.
 */
export const updateAppointmentStatus = async (appointmentId, newStatus, details = {}) => {
    const updateData = {
        status: newStatus,
        final_observations: details.observations,
        final_weight: details.weight,
        service_price: details.price,
        payment_method: details.paymentMethod,
        shampoo_type: details.shampoo
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

/**
 * Reprogramar cita.
 */
export const rescheduleAppointmentFromDashboard = async (appointmentId, updatedData) => {
    const appointmentRes = await supabase.from('appointments').select('pet_id, user_id').eq('id', appointmentId).single();
    
    let petName = null;
    let clientName = null;
    
    if (appointmentRes.data) {
        const [petRes, clientRes] = await Promise.all([
            supabase.from('pets').select('name').eq('id', appointmentRes.data.pet_id).single(),
            supabase.from('profiles').select('first_name, last_name, full_name').eq('id', appointmentRes.data.user_id).single()
        ]);
        
        petName = petRes.data?.name;
        const cp = clientRes.data;
        clientName = (cp?.first_name && cp?.last_name) ? `${cp.first_name} ${cp.last_name}` : cp?.full_name;
    }

    const dataToUpdate = {
        ...updatedData,
        status: 'pendiente',
        pet_name_denorm: petName,
        client_name_denorm: clientName
    };

    const { data, error } = await supabase
        .from('appointments')
        .update(dataToUpdate)
        .eq('id', appointmentId)
        .select();

    if (error) return { success: false, error };
    return { success: true, data: data[0] };
};

/**
 * Eliminar cita.
 */
export const deleteAppointment = async (appointmentId) => {
    // Limpieza de fotos en storage (opcional, se omite lógica compleja por brevedad)
    await supabase.from('appointment_photos').delete().eq('appointment_id', appointmentId);
    await supabase.from('pet_weight_history').delete().eq('appointment_id', appointmentId);
    
    const { error: appointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

    if (appointmentError) return { success: false, error: appointmentError };
    return { success: true };
};

/**
 * Horarios ocupados.
 */
export const getBookedTimesForDashboard = async (date) => {
    const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date)
        .in('status', ['pendiente', 'confirmada', 'completada']);

    if (appointmentsError) console.error("Error al verificar horarios:", appointmentsError);

    const { data: blockedSlots, error: blockedError } = await supabase
        .from('blocked_slots')
        .select('blocked_time')
        .eq('blocked_date', date);

    if (blockedError) console.error("Error al verificar bloqueos:", blockedError);
    
    const appointmentCounts = (appointments || []).reduce((acc, app) => {
        const time = app.appointment_time.slice(0, 5);
        acc[time] = (acc[time] || 0) + 1;
        return acc;
    }, {});
    
    const blockedTimes = blockedSlots ? blockedSlots.map(slot => slot.blocked_time.slice(0, 5)) : [];
    const fullyBookedTimes = Object.keys(appointmentCounts).filter(time => appointmentCounts[time] >= 3);
    
    return [...new Set([...fullyBookedTimes, ...blockedTimes])];
};

/**
 * Fotos de cita.
 */
export const getAppointmentPhotos = async (appointmentId) => {
    const { data, error } = await supabase
        .from('appointment_photos')
        .select('photo_type, image_url')
        .eq('appointment_id', appointmentId);
    
    if (error) return [];
    return data;
};

/**
 * Subir foto.
 */
export const uploadAppointmentPhoto = async (appointmentId, file, photoType) => {
    if (!file) return { success: false, error: { message: 'No hay archivo.' } };
    const fileName = `public/${appointmentId}-${photoType}-${Date.now()}`;
    
    const { error: uploadError } = await supabase.storage
        .from('appointment_images')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) return { success: false, error: uploadError };

    const { data: { publicUrl } } = supabase.storage.from('appointment_images').getPublicUrl(fileName);

    const { data: dbData, error: dbError } = await supabase
        .from('appointment_photos')
        .upsert({
            appointment_id: appointmentId,
            photo_type: photoType,
            image_url: publicUrl
        }, { onConflict: 'appointment_id, photo_type' })
        .select();

    if (dbError) return { success: false, error: dbError };
    return { success: true, data: dbData[0] };
};

/**
 * Subir boleta.
 */
export const uploadReceiptFile = async (appointmentId, file) => {
    if (!file) return { success: false, error: { message: 'No hay archivo.' } };
    const ext = file.name.split('.').pop();
    const fileName = `public/${appointmentId}-receipt-${Date.now()}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) return { success: false, error: uploadError };

    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

    const { error: dbError } = await supabase
        .from('appointments')
        .update({ invoice_pdf_url: publicUrl })
        .eq('id', appointmentId);

    if (dbError) return { success: false, error: dbError };
    return { success: true, url: publicUrl };
};

/**
 * Estadísticas Mensuales.
 */
export const getMonthlyAppointmentsStats = async () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 11);
    const startStr = date.toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('status', 'completada')
        .gte('appointment_date', startStr);

    if (error) {
        console.error('Error stats mensuales:', error);
        return [];
    }

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const counts = {};
    
    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const k = `${d.getFullYear()}-${d.getMonth()}`;
        counts[k] = { month_name: `${monthNames[d.getMonth()]}`, count: 0, sort: d.getTime() };
    }

    data.forEach(app => {
        const d = new Date(app.appointment_date + 'T12:00:00');
        const k = `${d.getFullYear()}-${d.getMonth()}`;
        if (counts[k]) counts[k].count++;
    });

    return Object.values(counts).sort((a, b) => a.sort - b.sort).map(c => ({ month_name: c.month_name, service_count: c.count }));
};