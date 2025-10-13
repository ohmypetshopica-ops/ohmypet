import { supabase } from '../../core/supabase.js';

/**
 * Registra un nuevo peso para una mascota
 */
export const addWeightRecord = async (petId, weight, appointmentId = null, notes = null) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
        .from('pet_weight_history')
        .insert([{
            pet_id: petId,
            appointment_id: appointmentId,
            weight: parseFloat(weight),
            recorded_by: user.id,
            notes: notes
        }])
        .select();

    if (error) {
        console.error('Error al registrar peso:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

/**
 * Obtiene el historial de pesos de una mascota
 */
export const getPetWeightHistory = async (petId) => {
    const { data, error } = await supabase
        .from('pet_weight_history')
        .select(`
            *,
            appointments (
                appointment_date,
                service
            ),
            profiles:recorded_by (
                full_name,
                first_name,
                last_name
            )
        `)
        .eq('pet_id', petId)
        .order('recorded_at', { ascending: false });

    if (error) {
        console.error('Error al obtener historial de pesos:', error);
        return [];
    }
    return data;
};

/**
 * Obtiene el último peso registrado de una mascota
 */
export const getLastWeight = async (petId) => {
    const { data, error } = await supabase
        .from('pet_weight_history')
        .select('weight, recorded_at')
        .eq('pet_id', petId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error al obtener último peso:', error);
        return null;
    }
    return data;
};

/**
 * Actualiza un registro de peso
 */
export const updateWeightRecord = async (recordId, weight, notes = null) => {
    const updateData = { weight: parseFloat(weight) };
    if (notes !== null) {
        updateData.notes = notes;
    }

    const { data, error } = await supabase
        .from('pet_weight_history')
        .update(updateData)
        .eq('id', recordId)
        .select();

    if (error) {
        console.error('Error al actualizar peso:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

/**
 * Elimina un registro de peso
 */
export const deleteWeightRecord = async (recordId) => {
    const { error } = await supabase
        .from('pet_weight_history')
        .delete()
        .eq('id', recordId);

    if (error) {
        console.error('Error al eliminar peso:', error);
        return { success: false, error };
    }
    return { success: true };
};

export { supabase };