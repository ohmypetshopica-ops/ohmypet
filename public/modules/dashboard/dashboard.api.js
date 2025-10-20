import { supabase } from '../../core/supabase.js';

// --- NUEVA FUNCIÓN PARA NOTIFICACIONES ---
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

export const getAppointments = async (page = 1, itemsPerPage = 10, search = '', status = '', date = '') => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    let query = supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, status, final_observations, 
            final_weight, invoice_pdf_url, pet_id, service_price, payment_method, 
            pets ( name ), 
            profiles ( full_name, first_name, last_name, phone )
        `, { count: 'exact' });
        
    if (search) {
        query = query.or(`pets.name.ilike.%${search}%,profiles.full_name.ilike.%${search}%`);
    }
    if (status) query = query.eq('status', status);
    if (date) query = query.eq('appointment_date', date);

    const { data, error, count } = await query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .range(from, to);
    
    if (error) console.error('Error al obtener citas:', error);
    return { data: data || [], count: count || 0 };
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
    const { data, error } = await query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });
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
    const { error: uploadError } = await supabase.storage.from('appointment_images').upload(fileName, file, { cacheControl: '3600', upsert: true });
    if (uploadError) return { success: false, error: uploadError };
    const { data: { publicUrl } } = supabase.storage.from('appointment_images').getPublicUrl(fileName);
    const { data, error: dbError } = await supabase.from('appointment_photos').upsert({ appointment_id: appointmentId, photo_type: photoType, image_url: publicUrl }, { onConflict: 'appointment_id, photo_type' }).select();
    if (dbError) return { success: false, error: dbError };
    return { success: true, data: data[0] };
};

export const uploadReceiptFile = async (appointmentId, file) => {
    if (!file) return { success: false, error: { message: 'No se proporcionó ningún archivo.' } };
    const fileExtension = file.name.split('.').pop();
    const fileName = `public/${appointmentId}-receipt-${Date.now()}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file, { cacheControl: '3600', upsert: true });
    if (uploadError) return { success: false, error: uploadError };
    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
    const { error: dbError } = await supabase.from('appointments').update({ invoice_pdf_url: publicUrl }).eq('id', appointmentId);
    if (dbError) return { success: false, error: dbError };
    return { success: true, url: publicUrl };
};

export const getClientDetails = async (clientId) => {
    try {
        const [profileRes, petsRes, appointmentsRes] = await Promise.all([
            supabase.from('profiles').select('*, email').eq('id', clientId).single(),
            supabase.from('pets').select('*').eq('owner_id', clientId),
            supabase.from('appointments').select('*, pets(name)').eq('user_id', clientId).order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false })
        ]);
        if (profileRes.error) throw profileRes.error;
        return { profile: profileRes.data, pets: petsRes.data || [], appointments: appointmentsRes.data || [] };
    } catch (error) {
        console.error('Error al obtener los detalles del cliente:', error);
        return null;
    }
};

export const getDashboardStats = async () => {
    const [clients, pets, products, { count: pendingAppointments }] = await Promise.all([
        getClientCount(), getPetCount(), getProductsCount(),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pendiente')
    ]);
    return { clients: clients || 0, pets: pets || 0, appointments: pendingAppointments || 0, products: products || 0 };
};

export const getMonthlyAppointmentsStats = async () => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const { data, error } = await supabase.from('appointments').select('appointment_date').eq('status', 'completada').gte('appointment_date', twelveMonthsAgo.toISOString().split('T')[0]);
    if (error) return [];
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthlyCounts = {};
    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${monthNames[d.getMonth()]}`;
        monthlyCounts[monthKey] = { sortKey: d.getFullYear() * 100 + d.getMonth(), month_name: monthNames[d.getMonth()], service_count: 0 };
    }
    data.forEach(appointment => {
        const date = new Date(appointment.appointment_date + 'T12:00:00');
        const monthKey = `${date.getFullYear()}-${monthNames[date.getMonth()]}`;
        if (monthlyCounts[monthKey]) monthlyCounts[monthKey].service_count++;
    });
    return Object.values(monthlyCounts).sort((a, b) => a.sortKey - b.sortKey);
};

export const getReportData = async (startDate, endDate) => {
    // 1. Obtener datos de servicios y ventas en paralelo
    const [servicesRes, salesRes] = await Promise.all([
        supabase.from('appointments').select('appointment_date, service_price, payment_method, pets(name), profiles(full_name, first_name, last_name)').eq('status', 'completada').gte('appointment_date', startDate).lte('appointment_date', endDate),
        supabase.from('sales').select('created_at, total_price, payment_method, product:product_id(name), client:client_id(full_name, first_name, last_name)').gte('created_at', startDate).lte('created_at', endDate)
    ]);

    if (servicesRes.error || salesRes.error) {
        console.error('Error al obtener datos del reporte:', servicesRes.error || salesRes.error);
        return null;
    }

    const services = servicesRes.data || [];
    const sales = salesRes.data || [];

    // 2. Procesar datos de servicios
    let servicesRevenue = 0;
    const servicesPaymentMap = new Map();
    services.forEach(service => {
        const price = service.service_price || 0;
        servicesRevenue += price;
        const method = service.payment_method || 'No especificado';
        servicesPaymentMap.set(method, (servicesPaymentMap.get(method) || 0) + price);
    });
    const detailedServices = services.map(service => {
        const owner = service.profiles;
        const ownerName = (owner?.first_name && owner?.last_name) ? `${owner.first_name} ${owner.last_name}` : owner?.full_name || 'N/A';
        return { fecha: service.appointment_date, cliente: ownerName, mascota: service.pets?.name || 'N/A', metodo_pago: service.payment_method || 'N/A', ingreso: service.service_price || 0 };
    });

    // 3. Procesar datos de ventas
    let salesRevenue = 0;
    const salesPaymentMap = new Map();
    sales.forEach(sale => {
        const price = sale.total_price || 0;
        salesRevenue += price;
        const method = sale.payment_method || 'No especificado';
        salesPaymentMap.set(method, (salesPaymentMap.get(method) || 0) + price);
    });
    const detailedSales = sales.map(sale => {
        const client = sale.client;
        const clientName = (client?.first_name && client?.last_name) ? `${client.first_name} ${client.last_name}` : client?.full_name || 'N/A';
        return { fecha: new Date(sale.created_at).toISOString().split('T')[0], cliente: clientName, producto: sale.product?.name || 'N/A', metodo_pago: sale.payment_method || 'N/A', ingreso: sale.total_price || 0 };
    });

    // 4. Devolver un objeto con toda la información separada
    return {
        services: {
            totalRevenue: servicesRevenue,
            count: services.length,
            paymentSummary: Array.from(servicesPaymentMap, ([method, total]) => ({ payment_method: method, total })),
            details: detailedServices
        },
        sales: {
            totalRevenue: salesRevenue,
            count: sales.length,
            paymentSummary: Array.from(salesPaymentMap, ([method, total]) => ({ payment_method: method, total })),
            details: detailedSales
        }
    };
};

export const registerClientFromDashboard = async (clientData) => {
    // ... (código sin cambios)
};

export const addPetFromDashboard = async (petData) => {
    // ... (código sin cambios)
};

export const getClientsWithPets = async () => {
    // ... (código sin cambios)
};

export const getBookedTimesForDashboard = async (date) => {
    // ... (código sin cambios)
};

export const addAppointmentFromDashboard = async (appointmentData) => {
    // ... (código sin cambios)
};

export const updateClientProfile = async (clientId, profileData) => {
    // ... (código sin cambios)
};

export const getSales = async () => {
    const { data, error } = await supabase.from('sales').select(`*, client:client_id(id, first_name, last_name, full_name), product:product_id(id, name)`).order('created_at', { ascending: false });
    if (error) return [];
    return data;
};

export const addSale = async (saleData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: { message: 'Usuario no autenticado' } };
    const { error: saleError } = await supabase.from('sales').insert([{ ...saleData, recorded_by: user.id }]);
    if (saleError) return { success: false, error: saleError };
    const { data: product, error: productError } = await supabase.from('products').select('stock').eq('id', saleData.product_id).single();
    if (productError) return { success: true, warning: 'Venta registrada, pero no se pudo actualizar el stock.' };
    const newStock = product.stock - saleData.quantity;
    const { error: updateStockError } = await supabase.from('products').update({ stock: newStock }).eq('id', saleData.product_id);
    if (updateStockError) return { success: true, warning: 'Venta registrada, pero no se pudo actualizar el stock.' };
    return { success: true };
};

export { supabase };