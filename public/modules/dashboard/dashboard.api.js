// public/modules/dashboard/dashboard.api.js

import { supabase } from '../../core/supabase.js';

// --- ESTADÍSTICAS DEL DASHBOARD ---
export const getDashboardStats = async () => {
    const [clientsRes, petsRes, appointmentsRes, productsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'cliente'),
        supabase.from('pets').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true })
    ]);
    return {
        clients: clientsRes.count || 0,
        pets: petsRes.count || 0,
        appointments: appointmentsRes.count || 0,
        products: productsRes.count || 0
    };
};

export const getClientCount = async () => {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'cliente');
    return count || 0;
};

export const getPetCount = async () => {
    const { count } = await supabase.from('pets').select('id', { count: 'exact', head: true });
    return count || 0;
};

export const getAppointmentsCount = async () => {
    const { count } = await supabase.from('appointments').select('id', { count: 'exact', head: true });
    return count || 0;
};

export const getProductsCount = async () => {
    const { count } = await supabase.from('products').select('id', { count: 'exact', head: true });
    return count || 0;
};

export const getUpcomingAppointments = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('appointments')
        .select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`)
        .gte('appointment_date', today)
        .eq('status', 'confirmada')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);
    if (error) console.error('Error al obtener próximas citas:', error);
    return data || [];
};

export const getMonthlyAppointmentsStats = async () => {
    const { data, error } = await supabase.rpc('get_monthly_appointments_stats');
    if (error) {
        console.error('Error al obtener estadísticas mensuales:', error);
        return [];
    }
    return data || [];
};

// --- CLIENTES ---
export const getClients = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, role, phone, district, created_at')
        .eq('role', 'cliente')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error al obtener clientes:', error);
        return [];
    }
    
    console.log('Clientes obtenidos:', data);
    return data || [];
};

export const searchClients = async (searchTerm) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, role, phone, district, created_at')
        .eq('role', 'cliente')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
    
    if (error) {
        console.error('Error al buscar clientes:', error);
        return [];
    }
    
    console.log('Clientes encontrados:', data);
    return data || [];
};

export const getClientDetails = async (clientId) => {
    try {
        const [profileRes, petsRes, appointmentsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', clientId).single(),
            supabase.from('pets').select('*').eq('owner_id', clientId),
            supabase.from('appointments').select('*, pets(name)').eq('user_id', clientId).order('appointment_date', { ascending: false })
        ]);

        if (profileRes.error) throw profileRes.error;

        return {
            profile: profileRes.data,
            pets: petsRes.data || [],
            appointments: appointmentsRes.data || []
        };
    } catch (error) {
        console.error('Error al obtener detalles del cliente:', error);
        return null;
    }
};

export const registerClientFromDashboard = async (clientData) => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: clientData.email,
            password: clientData.password,
            options: {
                data: {
                    first_name: clientData.firstName,
                    last_name: clientData.lastName,
                    full_name: `${clientData.firstName} ${clientData.lastName}`
                },
                emailRedirectTo: 'https://ohmypet.codearlo.com/public/modules/login/email-confirmed.html'
            }
        });

        if (authError) {
            console.error('Error al registrar cliente:', authError);
            return { success: false, error: authError };
        }

        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    first_name: clientData.firstName,
                    last_name: clientData.lastName,
                    role: 'cliente'
                })
                .eq('id', authData.user.id);

            if (profileError) {
                console.error('Error al actualizar perfil:', profileError);
            }
        }

        return { 
            success: true, 
            data: authData.user,
            message: 'Cliente registrado exitosamente. Se ha enviado un email de confirmación.'
        };
    } catch (error) {
        console.error('Error en registerClientFromDashboard:', error);
        return { success: false, error };
    }
};

// --- CITAS ---
export const getAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`id, appointment_date, appointment_time, service, status, final_observations, final_weight, invoice_pdf_url, pet_id, service_price, payment_method, pets ( name ), profiles ( full_name, first_name, last_name )`)
        .order('created_at', { ascending: false });
    if (error) console.error('Error al obtener citas:', error);
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

export const filterAppointments = async (filters) => {
    let query = supabase.from('appointments').select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.date) query = query.eq('appointment_date', filters.date);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) console.error('Error al filtrar citas:', error);
    return data || [];
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

export const uploadReceiptFile = async (appointmentId, file) => {
    if (!file) return { success: false, error: { message: 'No se proporcionó ningún archivo.' } };

    const fileExtension = file.name.split('.').pop();
    const fileName = `public/${appointmentId}-receipt-${Date.now()}.${fileExtension}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        console.error('Error al subir la boleta:', uploadError);
        return { success: false, error: uploadError };
    }

    const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

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

export const addService = async (serviceData) => {
    const { error } = await supabase.from('services').insert([serviceData]);
    if (error) {
        console.error('Error al agregar servicio:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const updateService = async (serviceId, serviceData) => {
    const { error } = await supabase.from('services').update(serviceData).eq('id', serviceId);
    if (error) {
        console.error('Error al actualizar servicio:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const deleteService = async (serviceId) => {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) {
        console.error('Error al eliminar servicio:', error);
        return { success: false, error };
    }
    return { success: true };
};