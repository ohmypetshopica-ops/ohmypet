// public/modules/profile/profile.api.js

import { supabase } from '../../core/supabase.js';

export const getUserProfile = async (userId) => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error al obtener el perfil:', error);
        return null;
    }
    return profile;
};

export const getUserAppointments = async (userId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            pets ( name, image_url ),
            appointment_photos ( photo_type, image_url )
        `)
        .eq('user_id', userId)
        .order('appointment_date', { ascending: false });

    if (error) {
        console.error('Error al obtener las citas del usuario:', error);
        return [];
    }
    return data;
};

export const cancelAppointment = async (appointmentId) => {
    const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelada' })
        .eq('id', appointmentId)
        .select();

    if (error) {
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const getBookedTimes = async (date) => {
    const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date)
        .in('status', ['pendiente', 'confirmada', 'completada']);

    if (appointmentsError) {
        console.error("Error al verificar horarios de citas:", appointmentsError);
    }

    const { data: blockedSlots, error: blockedError } = await supabase
        .from('blocked_slots')
        .select('blocked_time')
        .eq('blocked_date', date);

    if (blockedError) {
        console.error("Error al verificar horarios bloqueados:", blockedError);
    }

    const bookedFromAppointments = appointments ? appointments.map(app => app.appointment_time.slice(0, 5)) : [];
    const bookedFromBlocked = blockedSlots ? blockedSlots.map(slot => slot.blocked_time.slice(0, 5)) : [];
    
    return [...new Set([...bookedFromAppointments, ...bookedFromBlocked])];
};

export const rescheduleAppointment = async (appointmentId, newDate, newTime) => {
    const { data, error } = await supabase
        .from('appointments')
        .update({ 
            appointment_date: newDate, 
            appointment_time: newTime,
            status: 'pendiente'
        })
        .eq('id', appointmentId)
        .select();

    if (error) {
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

// --- NUEVA FUNCIÓN ---
export const getPetLastServiceDate = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('pet_id', petId)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
        console.error('Error al obtener la última fecha de servicio:', error);
        return null;
    }
    
    return data ? data.appointment_date : null;
};

export { supabase };