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

// MODIFICACIÓN CLAVE: Se añade paginación (range) a getAppointments y se invierte el orden a DESC
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
        
    // Aplicar filtros
    if (search) {
        query = query.or(`pets.name.ilike.%${search}%,profiles.full_name.ilike.%${search}%`);
    }
    if (status) query = query.eq('status', status);
    if (date) query = query.eq('appointment_date', date);

    const { data, error, count } = await query
        .order('appointment_date', { ascending: false }) // Más reciente primero
        .order('appointment_time', { ascending: false }) // En caso de misma fecha, por hora
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
    // ORDENACIÓN: Descendente para la gestión (más reciente primero)
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
            supabase.from('profiles').select('*, email').eq('id', clientId).single(),
            supabase.from('pets').select('*').eq('owner_id', clientId),
            // ORDENACIÓN: Descendente para que el historial muestre la más reciente primero
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

export const getReportData = async (startDate, endDate) => {
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

    return {
        totalRevenue,
        serviceCount: services.length,
        paymentSummary,
        detailedServices
    };
};

/**
 * Obtiene y procesa los datos de ventas de productos para el reporte.
 */
export const getSalesReportData = async (startDate, endDate) => {
    const { data: sales, error } = await supabase
        .from('sales')
        .select(`
            created_at,
            total_price,
            quantity,
            payment_method,
            client:client_id ( full_name, first_name, last_name ),
            product:product_id ( name, category )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

    if (error) {
        console.error('Error al obtener datos del reporte de ventas:', error);
        return null;
    }

    if (!sales || sales.length === 0) {
        return {
            totalSalesRevenue: 0,
            productsSoldCount: 0,
            paymentMethodSummary: [],
            detailedSales: []
        };
    }

    let totalSalesRevenue = 0;
    let productsSoldCount = 0;
    const paymentMethodSummaryMap = new Map();

    sales.forEach(sale => {
        const price = sale.total_price || 0;
        totalSalesRevenue += price;
        productsSoldCount += sale.quantity;

        // =================== CÓDIGO ACTUALIZADO ===================
        const method = sale.payment_method || 'No especificado';
        if (paymentMethodSummaryMap.has(method)) {
            paymentMethodSummaryMap.set(method, paymentMethodSummaryMap.get(method) + price);
        } else {
            paymentMethodSummaryMap.set(method, price);
        }
        // =================== FIN CÓDIGO ACTUALIZADO ===================
    });

    const paymentMethodSummary = Array.from(paymentMethodSummaryMap, ([payment_method, total]) => ({
        payment_method,
        total
    }));

    const detailedSales = sales.map(sale => {
         const clientProfile = sale.client;
         const clientName = (clientProfile?.first_name && clientProfile?.last_name) 
            ? `${clientProfile.first_name} ${clientProfile.last_name}` 
            : clientProfile?.full_name || 'N/A';

        return {
            fecha: new Date(sale.created_at).toISOString().split('T')[0],
            cliente: clientName,
            producto: sale.product?.name || 'N/A',
            categoria: sale.product?.category || 'N/A',
            cantidad: sale.quantity,
            metodo_pago: sale.payment_method || 'N/A',
            ingreso: sale.total_price || 0
        };
    });

    return {
        totalSalesRevenue,
        productsSoldCount,
        paymentMethodSummary,
        detailedSales
    };
};


export const registerClientFromDashboard = async (clientData) => {
    try {
        let userId = null;

        if (clientData.email && clientData.password) {
            console.log('Registrando cliente CON autenticación (email + contraseña)...');
            
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: clientData.email,
                password: clientData.password,
                options: {
                    data: {
                        first_name: clientData.firstName,
                        last_name: clientData.lastName,
                        full_name: `${clientData.firstName} ${clientData.lastName}`
                    },
                    emailRedirectTo: undefined
                }
            });

            if (authError) {
                console.error('Error al crear cuenta de autenticación:', authError);
                return { success: false, error: authError };
            }

            if (!authData.user) {
                return { success: false, error: { message: 'No se pudo crear el usuario' } };
            }

            userId = authData.user.id;

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    first_name: clientData.firstName,
                    last_name: clientData.lastName,
                    full_name: `${clientData.firstName} ${clientData.lastName}`,
                    email: clientData.email,
                    phone: clientData.phone,
                    doc_type: clientData.docType,
                    doc_num: clientData.docNum,
                    district: clientData.district,
                    emergency_contact_name: clientData.emergencyContactName,
                    emergency_contact_phone: clientData.emergencyContactPhone,
                    role: 'cliente',
                    onboarding_completed: true
                })
                .eq('id', userId);

            if (profileError) {
                console.error('Error al actualizar perfil:', profileError);
                return { success: false, error: profileError };
            }

            console.log('✅ Cliente registrado CON acceso web');
            return { 
                success: true, 
                data: { id: userId },
                message: 'Cliente registrado con acceso a la plataforma.'
            };

        } else {
            console.log('Registrando cliente SIN autenticación usando función RPC...');
            
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

            if (rpcError) {
                console.error('Error al crear perfil sin autenticación:', rpcError);
                return { success: false, error: rpcError };
            }

            if (!profileId) {
                return { success: false, error: { message: 'No se pudo crear el perfil' } };
            }

            userId = profileId;
            console.log('✅ Cliente registrado SIN acceso web (solo datos físicos)');
            
            return { 
                success: true, 
                data: { id: userId },
                message: 'Cliente registrado exitosamente (sin acceso web).'
            };
        }

    } catch (error) {
        console.error('Error general en registerClientFromDashboard:', error);
        return { success: false, error };
    }
};

export const addPetFromDashboard = async (petData) => {
    if (!petData.owner_id) {
        return { success: false, error: { message: 'El ID del dueño es requerido.' } };
    }
    const { error } = await supabase.from('pets').insert([petData]);
    if (error) {
        console.error('Error al agregar mascota desde el dashboard:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const getClientsWithPets = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            first_name,
            last_name,
            phone,
            pets ( id, name )
        `)
        .eq('role', 'cliente')
        .order('first_name', { ascending: true });

    if (error) {
        console.error('Error al obtener clientes con mascotas:', error);
        return [];
    }
    return data;
};

export const getBookedTimesForDashboard = async (date) => {
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

export const addAppointmentFromDashboard = async (appointmentData) => {
    const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select();

    if (error) {
        console.error('Error al crear la cita:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

// --- NUEVA FUNCIÓN PARA ACTUALIZAR PERFIL DE CLIENTE ---
export const updateClientProfile = async (clientId, profileData) => {
    const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', clientId)
        .select();

    if (error) {
        console.error('Error al actualizar el perfil del cliente:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};
// --- FIN NUEVA FUNCIÓN ---

// =================== CÓDIGO A AGREGAR ===================
/**
 * Obtiene un listado de ventas con datos del cliente y producto.
 */
export const getSales = async () => {
    const { data, error } = await supabase
        .from('sales')
        .select(`
            *,
            client:client_id ( id, first_name, last_name, full_name ),
            product:product_id ( id, name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al obtener ventas:', error);
        return [];
    }
    return data;
};

/**
 * Registra una nueva venta y descuenta el stock del producto.
 */
export const addSale = async (saleData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: { message: 'Usuario no autenticado' } };

    // 1. Registrar la venta
    const { error: saleError } = await supabase.from('sales').insert([{
        ...saleData,
        recorded_by: user.id
    }]);

    if (saleError) {
        console.error('Error al registrar la venta:', saleError);
        return { success: false, error: saleError };
    }

    // 2. Obtener el stock actual del producto
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', saleData.product_id)
        .single();

    if (productError) {
        console.error('Error al obtener stock para actualizar:', productError);
        return { success: true, warning: 'Venta registrada, pero no se pudo actualizar el stock.' };
    }

    // 3. Calcular y actualizar el nuevo stock
    const newStock = product.stock - saleData.quantity;
    const { error: updateStockError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', saleData.product_id);

    if (updateStockError) {
        console.error('Error al actualizar el stock:', updateStockError);
        return { success: true, warning: 'Venta registrada, pero no se pudo actualizar el stock.' };
    }

    return { success: true };
};
// =================== FIN DEL CÓDIGO ===================

export { supabase };