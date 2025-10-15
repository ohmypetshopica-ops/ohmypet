import { supabase } from '../../core/supabase.js';

export const getClientCount = async () => {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'cliente');
    if (error) console.error('Error al contar clientes:', error);
    return count || 0;
};

export const getPetCount = async () => {
    const { count, error } = await supabase.from('pets').select('*', { count: 'exact', head: true });
    if (error) console.error('Error al contar mascotas:', error);
    return count || 0;
};

export const getAppointmentsCount = async () => {
    const { count, error } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
    if (error) console.error('Error al contar citas:', error);
    return count || 0;
};

export const getProductsCount = async () => {
    const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (error) console.error('Error al contar productos:', error);
    return count || 0;
};

export const getUpcomingAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`id, appointment_date, appointment_time, service, status, pets ( name ), profiles ( full_name, first_name, last_name )`)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);
    if (error) console.error('Error al obtener próximas citas:', error);
    return data || [];
};

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

export const getServices = async () => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) console.error('Error al obtener servicios:', error);
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
        console.error('Error al obtener los detalles del cliente:', error);
        return null;
    }
};

export const getDashboardStats = async () => {
    const [clients, pets, products, { count: pendingAppointments }] = await Promise.all([
        getClientCount(),
        getPetCount(),
        getProductsCount(),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pendiente')
    ]);

    return {
        clients: clients || 0,
        pets: pets || 0,
        appointments: pendingAppointments || 0,
        products: products || 0
    };
};

export const getMonthlyAppointmentsStats = async () => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('status', 'completada')
        .gte('appointment_date', twelveMonthsAgo.toISOString().split('T')[0]);

    if (error) {
        console.error('Error al obtener estadísticas mensuales:', error);
        return [];
    }

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthlyCounts = {};

    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${monthNames[d.getMonth()]}`;
        monthlyCounts[monthKey] = {
            sortKey: d.getFullYear() * 100 + d.getMonth(),
            month_name: monthNames[d.getMonth()],
            service_count: 0
        };
    }

    data.forEach(appointment => {
        const date = new Date(appointment.appointment_date + 'T12:00:00');
        const monthKey = `${date.getFullYear()}-${monthNames[date.getMonth()]}`;
        if (monthlyCounts[monthKey]) {
            monthlyCounts[monthKey].service_count++;
        }
    });

    return Object.values(monthlyCounts).sort((a, b) => a.sortKey - b.sortKey);
};

// =======================================================
// ===========         CÓDIGO AÑADIDO            ===========
// =======================================================

/**
 * Obtiene y procesa los datos para la sección de reportes.
 * @param {string} startDate - Fecha de inicio en formato YYYY-MM-DD.
 * @param {string} endDate - Fecha de fin en formato YYYY-MM-DD.
 */
export const getReportData = async (startDate, endDate) => {
    // 1. Obtener todos los servicios completados en el rango de fechas
    const { data: services, error } = await supabase
        .from('appointments')
        .select('appointment_date, service_price, payment_method, pets (name), profiles (full_name, first_name, last_name)')
        .eq('status', 'completada')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate);

    if (error) {
        console.error('Error al obtener datos del reporte:', error);
        return null;
    }

    if (!services || services.length === 0) {
        return {
            totalRevenue: 0,
            serviceCount: 0,
            paymentSummary: [],
            detailedServices: []
        };
    }

    // 2. Procesar los datos para obtener los KPIs
    let totalRevenue = 0;
    const paymentSummaryMap = new Map();

    services.forEach(service => {
        const price = service.service_price || 0;
        totalRevenue += price;

        const method = service.payment_method || 'No especificado';
        if (paymentSummaryMap.has(method)) {
            paymentSummaryMap.set(method, paymentSummaryMap.get(method) + price);
        } else {
            paymentSummaryMap.set(method, price);
        }
    });

    const paymentSummary = Array.from(paymentSummaryMap, ([payment_method, total]) => ({
        payment_method,
        total
    }));

    // 3. Preparar los datos detallados para la descarga CSV
    const detailedServices = services.map(service => {
        const ownerProfile = service.profiles;
        const ownerName = (ownerProfile?.first_name && ownerProfile?.last_name) 
           ? `${ownerProfile.first_name} ${ownerProfile.last_name}` 
           : ownerProfile?.full_name || 'N/A';
       
       return {
           fecha: service.appointment_date,
           cliente: ownerName,
           mascota: service.pets?.name || 'N/A',
           metodo_pago: service.payment_method || 'N/A',
           ingreso: service.service_price || 0
       };
   });


    // 4. Devolver el objeto con todos los datos procesados
    return {
        totalRevenue,
        serviceCount: services.length,
        paymentSummary,
        detailedServices
    };
};

// =======================================================
// =======================================================

export { supabase };