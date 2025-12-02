// public/modules/dashboard/clients.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene el conteo total de clientes.
 */
export const getClientCount = async () => {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'cliente');
    
    if (error) console.error('Error al contar clientes:', error);
    return count || 0;
};

/**
 * Obtiene la lista de clientes con métricas básicas.
 */
export const getClients = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            pets:pets(count),
            last_appointment:appointments(appointment_date)
        `)
        .eq('role', 'cliente')
        .order('first_name', { ascending: true });

    if (error) {
        console.error('Error al obtener clientes:', error);
        return [];
    }

    return data.map(client => {
        const petsCount = client.pets?.[0]?.count || 0;
        let lastAppointmentDate = null;
        if (client.last_appointment && client.last_appointment.length > 0) {
            const sortedAppointments = client.last_appointment.sort((a, b) => 
                new Date(b.appointment_date) - new Date(a.appointment_date)
            );
            lastAppointmentDate = sortedAppointments[0].appointment_date;
        }

        return {
            ...client,
            pets_count: petsCount,
            last_appointment_date: lastAppointmentDate
        };
    });
};

/**
 * Búsqueda de clientes.
 */
export const searchClients = async (searchTerm) => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            pets:pets(count),
            last_appointment:appointments(appointment_date)
        `)
        .eq('role', 'cliente')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('first_name', { ascending: true });

    if (error) {
        console.error('Error al buscar clientes:', error);
        return [];
    }

    return data.map(client => {
        const petsCount = client.pets?.[0]?.count || 0;
        let lastAppointmentDate = null;
        if (client.last_appointment && client.last_appointment.length > 0) {
            const sortedAppointments = client.last_appointment.sort((a, b) => 
                new Date(b.appointment_date) - new Date(a.appointment_date)
            );
            lastAppointmentDate = sortedAppointments[0].appointment_date;
        }
        return { ...client, pets_count: petsCount, last_appointment_date: lastAppointmentDate };
    });
};

/**
 * Obtiene detalles profundos de un cliente.
 */
export const getClientDetails = async (clientId) => {
    try {
        const [profileRes, petsRes, appointmentsRes] = await Promise.all([
            supabase.from('profiles').select('*, email').eq('id', clientId).single(),
            supabase.from('pets').select('*').eq('owner_id', clientId),
            supabase.from('appointments').select('*, pets(name)').eq('user_id', clientId).order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false })
        ]);

        if (profileRes.error) throw profileRes.error;
        
        return {
            profile: profileRes.data,
            pets: petsRes.data || [],
            appointments: appointmentsRes.data || []
        };
    } catch (error) {
        console.error('Error al obtener los detalles del cliente:', error);
        return null;
    }
};

/**
 * Obtiene clientes con sus mascotas anidadas (usado para selects).
 */
export const getClientsWithPets = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, full_name, first_name, last_name, phone, email, district,
            pets (id, name, breed)
        `)
        .eq('role', 'cliente')
        .order('first_name', { ascending: true });

    if (error) {
        console.error('Error al obtener clientes con mascotas:', error);
        return [];
    }
    return data;
};

/**
 * Registra cliente nuevo.
 */
export const registerClientFromDashboard = async (clientData) => {
    // Lógica para registrar (con o sin auth)
    try {
        if (clientData.email && clientData.password) {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: clientData.email,
                password: clientData.password,
                options: {
                    data: {
                        first_name: clientData.firstName,
                        last_name: clientData.lastName,
                        full_name: `${clientData.firstName} ${clientData.lastName}`
                    }
                }
            });
            if (authError) return { success: false, error: authError };
            
            // Actualizar perfil
            await supabase.from('profiles').update({
                phone: clientData.phone,
                district: clientData.district,
                doc_type: clientData.docType,
                doc_num: clientData.docNum,
                emergency_contact_name: clientData.emergencyContactName,
                emergency_contact_phone: clientData.emergencyContactPhone,
                role: 'cliente',
                onboarding_completed: true
            }).eq('id', authData.user.id);

            return { success: true, data: { id: authData.user.id } };
        } else {
            // Registro sin Auth (Solo DB via RPC)
            const { data: profileId, error: rpcError } = await supabase
                .rpc('create_client_profile', {
                    p_first_name: clientData.firstName,
                    p_last_name: clientData.lastName,
                    p_phone: clientData.phone,
                    p_doc_type: clientData.docType,
                    p_doc_num: clientData.docNum,
                    p_district: clientData.district,
                    p_emergency_contact_name: clientData.emergencyContactName,
                    p_emergency_contact_phone: clientData.emergencyContactPhone
                });
            if (rpcError) return { success: false, error: rpcError };
            return { success: true, data: { id: profileId } };
        }
    } catch (error) {
        return { success: false, error };
    }
};

/**
 * Actualiza perfil.
 */
export const updateClientProfile = async (clientId, profileData) => {
    const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', clientId)
        .select();
    if (error) return { success: false, error };
    return { success: true, data: data[0] };
};

/**
 * Elimina cliente.
 */
export const deleteClient = async (clientId) => {
    // Nota: Simplificado para brevedad, asumiendo que tienes las políticas de cascada o lógica de borrado previo
    const { error } = await supabase.from('profiles').delete().eq('id', clientId);
    if (error) return { success: false, error };
    return { success: true };
};