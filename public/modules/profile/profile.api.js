// public/modules/profile/profile.api.js

// Importamos el cliente de Supabase desde el archivo centralizado
import { supabase } from '../../core/supabase.js';

/**
 * Obtiene el perfil de un usuario para obtener su nombre.
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<Object|null>} El perfil del usuario.
 */
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

/**
 * Obtiene todas las citas de un usuario específico.
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<Array>} La lista de citas.
 */
export const getUserAppointments = async (userId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            pets ( name, image_url )
        `)
        .eq('user_id', userId)
        .order('appointment_date', { ascending: false });

    if (error) {
        console.error('Error al obtener las citas del usuario:', error);
        return [];
    }
    return data;
};

/**
 * Cancela una cita específica.
 * @param {string} appointmentId - El ID de la cita a cancelar.
 * @returns {Promise<Object>} El resultado de la operación.
 */
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

/**
 * Obtiene los horarios ya reservados Y bloqueados para una fecha específica.
 * SOLO considera citas con estados que realmente ocupan el horario:
 * - pendiente, confirmada, completada (ocupan horario)
 * - cancelada, rechazada (NO ocupan horario)
 * 
 * @param {string} date - La fecha en formato YYYY-MM-DD.
 * @returns {Promise<Array>} Una lista de horarios ocupados (ej: ["09:00", "10:30"]).
 */
export const getBookedTimes = async (date) => {
    // Obtener SOLO citas que realmente ocupan el horario
    // Excluimos 'cancelada' y 'rechazada'
    const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date)
        .in('status', ['pendiente', 'confirmada', 'completada']);

    if (appointmentsError) {
        console.error("Error al verificar horarios de citas:", appointmentsError);
    }

    // Obtener horarios bloqueados
    const { data: blockedSlots, error: blockedError } = await supabase
        .from('blocked_slots')
        .select('blocked_time')
        .eq('blocked_date', date);

    if (blockedError) {
        console.error("Error al verificar horarios bloqueados:", blockedError);
    }

    // Combinar ambos arrays
    const bookedFromAppointments = appointments ? appointments.map(app => app.appointment_time.slice(0, 5)) : [];
    const bookedFromBlocked = blockedSlots ? blockedSlots.map(slot => slot.blocked_time.slice(0, 5)) : [];
    
    // Retornar array único combinado (sin duplicados)
    return [...new Set([...bookedFromAppointments, ...bookedFromBlocked])];
};

/**
 * Reprograma una cita existente.
 * @param {string} appointmentId - El ID de la cita.
 * @param {string} newDate - La nueva fecha.
 * @param {string} newTime - La nueva hora.
 * @returns {Promise<Object>} El resultado de la operación.
 */
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

// Exportamos el cliente para poder usarlo en otros archivos
export { supabase };