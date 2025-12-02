// public/modules/dashboard/calendar.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Bloquea un horario específico para que no se puedan agendar citas.
 */
export const blockTimeSlot = async (date, time, reason = 'Bloqueado por administrador') => {
    const { data, error } = await supabase
        .from('blocked_slots')
        .insert([{
            blocked_date: date,
            blocked_time: time,
            reason: reason
        }])
        .select();
    
    if (error) {
        console.error('Error al bloquear horario:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

/**
 * Desbloquea un horario previamente bloqueado.
 */
export const unblockTimeSlot = async (date, time) => {
    const { data, error } = await supabase
        .from('blocked_slots')
        .delete()
        .eq('blocked_date', date)
        .eq('blocked_time', time)
        .select();
    
    if (error) {
        console.error('Error al desbloquear horario:', error);
        return { success: false, error };
    }
    return { success: true };
};

/**
 * Obtiene todas las citas de un mes específico (Reutilizada aquí para el calendario).
 */
export const getMonthAppointments = async (year, month) => {
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id, 
            appointment_date, 
            appointment_time, 
            service, 
            status,
            pet_id,
            pets ( name ),
            profiles ( full_name, first_name, last_name )
        `)
        .gte('appointment_date', firstDay)
        .lte('appointment_date', lastDay)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
    
    if (error) {
        console.error('Error al obtener citas del mes:', error);
        return [];
    }
    return data || [];
};

/**
 * Obtiene todos los horarios bloqueados de un mes.
 */
export const getMonthBlockedSlots = async (year, month) => {
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('blocked_slots')
        .select('*')
        .gte('blocked_date', firstDay)
        .lte('blocked_date', lastDay)
        .order('blocked_date', { ascending: true })
        .order('blocked_time', { ascending: true });
    
    if (error) {
        console.error('Error al obtener horarios bloqueados:', error);
        return [];
    }
    return data || [];
};