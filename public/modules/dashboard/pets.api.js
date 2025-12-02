// public/modules/dashboard/pets.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene el conteo total de mascotas (Optimizado: usa count exacto sin bajar datos).
 */
export const getPetCount = async () => {
    const { count, error } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true }); // 'head: true' evita descargar los datos, solo cuenta.
    
    if (error) console.error('Error al contar mascotas:', error);
    return count || 0;
};

/**
 * Obtiene el conteo de perros (Optimizado).
 */
export const getDogCount = async () => {
    const { count, error } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .eq('species', 'Perro');
    
    if (error) console.error('Error al contar perros:', error);
    return count || 0;
};

/**
 * Obtiene todas las razas únicas (Optimizado: solo baja la columna raza).
 */
export const getAllBreeds = async () => {
    const { data, error } = await supabase
        .from('pets')
        .select('breed')
        .not('breed', 'is', null)
        .order('breed');
    
    if (error) return [];
    // Elimina duplicados en JS
    return [...new Set(data.map(p => p.breed))].sort();
};

/**
 * Obtiene mascotas paginadas (SUPER OPTIMIZADO).
 * Solo trae las columnas necesarias y usa lógica de búsqueda eficiente.
 */
export const getPetsPaginated = async (page = 1, itemsPerPage = 10, search = '', breeds = []) => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // 1. Selección específica: NO usamos '*'. Pedimos solo lo que la tabla muestra.
    // Esto reduce drásticamente el peso de la respuesta de la red.
    let query = supabase
        .from('pets')
        .select(`
            id, name, breed, sex, size, weight, birth_date, image_url, 
            last_grooming_date, reminder_frequency_days, owner_id,
            profiles ( full_name, first_name, last_name, phone )
        `, { count: 'exact' });

    // 2. Lógica de búsqueda inteligente
    if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        
        // Estrategia: Buscar primero IDs de dueños que coincidan (es más rápido filtrar IDs numéricos después)
        const { data: matchingOwners } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
            .limit(50); // Limitamos para no saturar
        
        const ownerIds = matchingOwners ? matchingOwners.map(o => o.id) : [];
        
        // Construir filtro OR: (Nombre Mascota O Raza Mascota O Dueño Encontrado)
        let orConditions = `name.ilike.%${searchTerm}%,breed.ilike.%${searchTerm}%`;
        
        if (ownerIds.length > 0) {
            orConditions += `,owner_id.in.(${ownerIds.join(',')})`;
        }
        
        query = query.or(orConditions);
    }

    // 3. Filtros de raza
    if (breeds.length > 0) {
        query = query.in('breed', breeds);
    }

    // 4. Ordenamiento y Paginación
    query = query
        .order('created_at', { ascending: false })
        .range(from, to);

    const { data, error, count } = await query;
    
    if (error) { 
        console.error('Error al obtener mascotas:', error); 
        return { pets: [], total: 0 }; 
    }
    
    return { pets: data || [], total: count || 0 };
};

export const getPetDetails = async (petId) => {
    const { data, error } = await supabase
        .from('pets')
        .select(`
            *, 
            profiles (id, full_name, first_name, last_name, phone, email, district), 
            appointments (
                id, appointment_date, appointment_time, service, status, 
                service_price, final_weight, payment_method, final_observations, shampoo_type
            )
        `)
        .eq('id', petId)
        .single();
        
    if (error) return null;
    
    // Ordenar citas en JS para aliviar al servidor
    if (data.appointments) {
        data.appointments.sort((a, b) => 
            new Date(`${b.appointment_date}T${b.appointment_time}`) - new Date(`${a.appointment_date}T${a.appointment_time}`)
        );
    }
    return data;
};

export const getPetLastServiceDate = async (petId) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('pet_id', petId)
        .eq('status', 'completada')
        .order('appointment_date', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') return null;
    return data ? data.appointment_date : null;
};

// Reutilizamos la lógica anterior para las demás funciones, que son ligeras
export const getPetsNeedingAppointment = async () => {
    const { data: pets, error } = await supabase
        .from('pets')
        .select(`
            id, name, image_url, owner_id, last_grooming_date, reminder_frequency_days,
            profiles ( first_name, last_name, full_name, phone )
        `)
        .not('last_grooming_date', 'is', null)
        .not('reminder_frequency_days', 'is', null);

    if (error) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return pets.filter(pet => {
        const lastGrooming = new Date(pet.last_grooming_date + 'T00:00:00');
        const nextAppointmentDate = new Date(lastGrooming);
        nextAppointmentDate.setDate(lastGrooming.getDate() + pet.reminder_frequency_days);
        return nextAppointmentDate <= today;
    });
};

export const addPetFromDashboard = async (petData) => {
    if (!petData.owner_id) return { success: false, error: { message: 'Falta ID dueño' } };
    const { error } = await supabase.from('pets').insert([petData]);
    if (error) return { success: false, error };
    return { success: true };
};

export const updatePet = async (petId, updates) => {
    const { data, error } = await supabase.from('pets').update(updates).eq('id', petId).select();
    if (error) return { success: false, error };
    return { success: true, data };
};

export const deletePet = async (petId) => {
    try {
        const { data: apps } = await supabase.from('appointments').select('id').eq('pet_id', petId);
        const appIds = apps ? apps.map(a => a.id) : [];

        if (appIds.length > 0) {
            // Limpieza profunda de datos relacionados
            const { data: photos } = await supabase.from('appointment_photos').select('image_url').in('appointment_id', appIds);
            if (photos?.length) {
                const files = photos.map(p => {
                    const parts = p.image_url.split('/');
                    return parts[parts.length - 1]; 
                });
                // await supabase.storage.from('appointment_images').remove(files); // Opcional: descomentar para borrar archivos físicos
            }
            
            await supabase.from('pet_weight_history').delete().eq('pet_id', petId);
            await supabase.from('appointments').delete().in('id', appIds);
        }
        
        await supabase.from('pets').delete().eq('id', petId);
        return { success: true };

    } catch (error) {
        return { success: false, error };
    }
};