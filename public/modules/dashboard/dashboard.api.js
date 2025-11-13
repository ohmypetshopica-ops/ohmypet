// public/modules/dashboard/dashboard.api.js

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

    // Procesar datos para agregar conteo de mascotas y última cita
    return data.map(client => {
        const petsCount = client.pets?.[0]?.count || 0;
        
        // Obtener la fecha de la última cita
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

    // Procesar datos para agregar conteo de mascotas y última cita
    return data.map(client => {
        const petsCount = client.pets?.[0]?.count || 0;
        
        // Obtener la fecha de la última cita
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

export const getAppointments = async (page = 1, itemsPerPage = 10, search = '', status = '', date = '') => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    let query = supabase
        .from('appointments')
        .select(`
            id, appointment_date, appointment_time, service, status, final_observations, 
            final_weight, invoice_pdf_url, pet_id, service_price, payment_method, shampoo_type,
            client_name_denorm, pet_name_denorm,
            pets!inner ( name, image_url ), 
            profiles!inner ( full_name, first_name, last_name, phone )
        `, { count: 'exact' });
        
    // ========== INICIO DE LA CORRECCIÓN CON DENORMALIZACIÓN ==========
    // Aplicar filtro directo en los nuevos campos denormalizados.
    if (search) {
        const searchTerm = `%${search}%`;
        // La consulta ahora busca si el término está en el nombre del cliente o de la mascota (denormalizado).
        const filterString = `pet_name_denorm.ilike."${searchTerm}",client_name_denorm.ilike."${searchTerm}"`;
        
        query = query.or(filterString);
    }
    // ========== FIN DE LA CORRECCIÓN ==========
    
    if (status) {
        query = query.eq('status', status);
    }
    
    if (date) {
        query = query.eq('appointment_date', date);
    }
    
    // Orden descendente (más recientes primero) y aplicar rango de paginación
    query = query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
        console.error('Error al obtener citas:', error);
        return { data: [], count: 0 };
    }
    
    return { data: data || [], count: count || 0 };
};


export const updateAppointmentStatus = async (appointmentId, newStatus, details = {}) => {
    const updateData = {
        status: newStatus,
        final_observations: details.observations,
        final_weight: details.weight,
        service_price: details.price,
        payment_method: details.paymentMethod,
        shampoo_type: details.shampoo
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

        // **** INICIO DE LA CORRECCIÓN ****
        // Convertir a mayúsculas para agrupar (ej. 'tarjeta' y 'TARJETA' se vuelven 'TARJETA')
        const method = (service.payment_method || 'DESCONOCIDO').toUpperCase();
        // **** FIN DE LA CORRECCIÓN ****

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
           // **** INICIO DE LA CORRECCIÓN ****
           metodo_pago: (service.payment_method || 'DESCONOCIDO').toUpperCase(),
           // **** FIN DE LA CORRECCIÓN ****
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

export const getSalesReportData = async (startDate, endDate) => {
    
    const startDateTime = new Date(startDate + 'T00:00:00');
    const endDateObj = new Date(endDate + 'T00:00:00');
    endDateObj.setDate(endDateObj.getDate() + 1); 
    const startISO = startDateTime.toISOString();
    const endISO = endDateObj.toISOString();

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
        .gte('created_at', startISO)       
        .lt('created_at', endISO);         

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
        
        // **** INICIO DE LA CORRECCIÓN ****
        // Convertir a mayúsculas para agrupar
        const method = (sale.payment_method || 'DESCONOCIDO').toUpperCase();
        // **** FIN DE LA CORRECCIÓN ****

        if (paymentMethodSummaryMap.has(method)) {
            paymentMethodSummaryMap.set(method, paymentMethodSummaryMap.get(method) + price);
        } else {
            paymentMethodSummaryMap.set(method, price);
        }
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
            // **** INICIO DE LA CORRECCIÓN ****
            metodo_pago: (sale.payment_method || 'DESCONOCIDO').toUpperCase(),
            // **** FIN DE LA CORRECCIÓN ****
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
            pets ( 
                id, 
                name,
                breed, 
                size,
                weight,
                sex,
                observations,
                image_url,
                birth_date,
                reminder_frequency_days,
                last_grooming_date
            )
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
        .select('appointment_time, id')
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
    
    const appointmentCounts = (appointments || []).reduce((acc, app) => {
        const time = app.appointment_time.slice(0, 5);
        acc[time] = (acc[time] || 0) + 1;
        return acc;
    }, {});
    
    const blockedTimes = blockedSlots ? blockedSlots.map(slot => slot.blocked_time.slice(0, 5)) : [];

    const fullyBookedTimes = Object.keys(appointmentCounts).filter(time => appointmentCounts[time] >= 3);
    
    return [...new Set([...fullyBookedTimes, ...blockedTimes])];
};

// ===========================================
// FUNCIÓN ACTUALIZADA CON DENORMALIZACIÓN
// ===========================================
export const addAppointmentFromDashboard = async (appointmentData) => {
    // 1. Fetch denormalized data
    const [petRes, clientRes] = await Promise.all([
        supabase.from('pets').select('name').eq('id', appointmentData.pet_id).single(),
        supabase.from('profiles').select('first_name, last_name, full_name').eq('id', appointmentData.user_id).single()
    ]);

    const petName = petRes.data?.name || 'Mascota eliminada';
    const clientProfile = clientRes.data;
    const clientName = (clientProfile?.first_name && clientProfile?.last_name) 
        ? `${clientProfile.first_name} ${clientProfile.last_name}` 
        : clientProfile?.full_name || 'Cliente eliminado';

    const insertData = {
        ...appointmentData,
        pet_name_denorm: petName,      // <<-- NUEVO CAMPO
        client_name_denorm: clientName // <<-- NUEVO CAMPO
    };
    
    const { data, error } = await supabase
        .from('appointments')
        .insert([insertData])
        .select();

    if (error) {
        console.error('Error al crear la cita:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

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

export const rescheduleAppointmentFromDashboard = async (appointmentId, updatedData) => {
    // 1. Fetch data to denormalize for update
    const appointmentRes = await supabase.from('appointments').select('pet_id, user_id').eq('id', appointmentId).single();
    
    let petName = null;
    let clientName = null;
    
    if (appointmentRes.data) {
        const [petRes, clientRes] = await Promise.all([
            supabase.from('pets').select('name').eq('id', appointmentRes.data.pet_id).single(),
            supabase.from('profiles').select('first_name, last_name, full_name').eq('id', appointmentRes.data.user_id).single()
        ]);
        
        petName = petRes.data?.name || 'Mascota eliminada';
        const clientProfile = clientRes.data;
        clientName = (clientProfile?.first_name && clientProfile?.last_name) 
            ? `${clientProfile.first_name} ${clientProfile.last_name}` 
            : clientProfile?.full_name || 'Cliente eliminado';
    }


    const dataToUpdate = {
        ...updatedData,
        status: 'pendiente',
        pet_name_denorm: petName,      // <<-- AÑADIDO
        client_name_denorm: clientName // <<-- AÑADIDO
    };

    const { data, error } = await supabase
        .from('appointments')
        .update(dataToUpdate)
        .eq('id', appointmentId)
        .select();

    if (error) {
        console.error('Error al reprogramar la cita:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

export const deleteAppointment = async (appointmentId) => {
    // 1. Eliminar fotos asociadas (si las hay)
    // Asumimos que las fotos están en un bucket 'appointment_images' y
    // la tabla es 'appointment_photos'
    const { data: photos, error: photoFetchError } = await supabase
        .from('appointment_photos')
        .select('image_url')
        .eq('appointment_id', appointmentId);

    if (photoFetchError) {
        console.warn('No se pudieron buscar fotos para eliminar:', photoFetchError.message);
    }

    if (photos && photos.length > 0) {
        // Extraer los nombres de los archivos de las URLs
        const fileNames = photos.map(photo => {
            const urlParts = photo.image_url.split('/');
            // Asegurarnos de tomar el path correcto en el bucket
            const bucketName = 'appointment_images';
            const pathIndex = photo.image_url.indexOf(bucketName + '/');
            if (pathIndex > -1) {
                 return photo.image_url.substring(pathIndex + bucketName.length + 1);
            }
            return urlParts[urlParts.length - 1]; // Fallback
        });
        
        // Eliminar los archivos del bucket
        const { error: storageError } = await supabase.storage
            .from('appointment_images')
            .remove(fileNames);
            
        if (storageError) {
            console.error('Error al eliminar archivos de storage:', storageError);
            // No detenemos el proceso, pero lo registramos
        }
    }
    
    // 2. Eliminar registros de la tabla 'appointment_photos'
    const { error: photoDbError } = await supabase
        .from('appointment_photos')
        .delete()
        .eq('appointment_id', appointmentId);

    if (photoDbError) {
        console.error('Error al eliminar registros de fotos de la DB:', photoDbError);
    }

    // --- INICIO: CÓDIGO AÑADIDO (Mascotas) ---
    // 3. Eliminar historial de peso asociado a ESTA cita
    const { error: weightError } = await supabase
        .from('pet_weight_history')
        .delete()
        .eq('appointment_id', appointmentId);
    
    if (weightError) {
        console.warn('Error al eliminar historial de peso de la cita:', weightError.message);
    }
    // --- FIN: CÓDIGO AÑADIDO ---
    
    // 4. Eliminar la cita principal
    const { error: appointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

    if (appointmentError) {
        console.error('Error al eliminar la cita:', appointmentError);
        return { success: false, error: appointmentError };
    }

    return { success: true };
};

// --- INICIO: CÓDIGO AÑADIDO (Mascotas) ---
/**
 * Elimina una mascota y todos sus datos asociados (citas, historial de peso).
 * @param {string} petId - El ID de la mascota a eliminar.
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
export const deletePet = async (petId) => {
    try {
        // 1. Obtener todas las citas de la mascota para eliminar fotos
        const { data: appointments, error: apptError } = await supabase
            .from('appointments')
            .select('id')
            .eq('pet_id', petId);
        
        if (apptError) throw new Error(`Error al obtener citas: ${apptError.message}`);

        const appointmentIds = appointments.map(a => a.id);

        if (appointmentIds.length > 0) {
            // 2. Eliminar fotos de storage de todas sus citas
            const { data: photos, error: photoError } = await supabase
                .from('appointment_photos')
                .select('image_url')
                .in('appointment_id', appointmentIds);

            if (photoError) console.warn("Error al buscar fotos de citas:", photoError.message);

            if (photos && photos.length > 0) {
                const fileNames = photos.map(photo => {
                    const urlParts = photo.image_url.split('/');
                    const bucketName = 'appointment_images';
                    const pathIndex = photo.image_url.indexOf(bucketName + '/');
                    if (pathIndex > -1) {
                         return photo.image_url.substring(pathIndex + bucketName.length + 1);
                    }
                    return urlParts[urlParts.length - 1];
                });
                
                await supabase.storage.from('appointment_images').remove(fileNames);
            }

            // 3. Eliminar 'appointment_photos' (se borra en cascada con 'appointments')
            // 4. Eliminar 'pet_weight_history'
            await supabase.from('pet_weight_history').delete().eq('pet_id', petId);
            
            // 5. Eliminar 'appointments'
            await supabase.from('appointments').delete().in('id', appointmentIds);
        }

        // 6. Eliminar foto de la mascota del storage 'pet_galleries'
        const { data: petData, error: petFetchError } = await supabase
            .from('pets')
            .select('image_url')
            .eq('id', petId)
            .single();
        
        if (petFetchError) console.warn("Error al buscar foto de mascota:", petFetchError.message);

        if (petData && petData.image_url) {
            const urlParts = petData.image_url.split('/');
            const bucketName = 'pet_galleries';
            const pathIndex = petData.image_url.indexOf(bucketName + '/');
            if (pathIndex > -1) {
                const fileName = petData.image_url.substring(pathIndex + bucketName.length + 1);
                await supabase.storage.from(bucketName).remove([fileName]);
            }
        }
        
        // 7. Finalmente, eliminar la mascota
        const { error: petDeleteError } = await supabase
            .from('pets')
            .delete()
            .eq('id', petId);
            
        if (petDeleteError) throw new Error(`Error al eliminar mascota: ${petDeleteError.message}`);

        return { success: true };

    } catch (error) {
        console.error('Error en el proceso de eliminación de la mascota:', error);
        return { success: false, error };
    }
};
// --- FIN: CÓDIGO AÑADIDO ---


export const deleteClient = async (clientId) => {
    try {
        // 1. Obtener todas las mascotas del cliente
        const { data: pets, error: petsError } = await supabase
            .from('pets')
            .select('id')
            .eq('owner_id', clientId);
        if (petsError) throw new Error(`Error al obtener mascotas: ${petsError.message}`);
        
        const petIds = pets.map(p => p.id);

        if (petIds.length > 0) {
            // 2. Eliminar CUALQUIER historial de peso de CUALQUIERA de las mascotas
            const { error: weightError } = await supabase
                .from('pet_weight_history')
                .delete()
                .in('pet_id', petIds);
            if (weightError) console.warn('Error al eliminar historial de peso:', weightError.message); // No es crítico
        }

        // 3. Eliminar todas las ventas asociadas al cliente
        const { error: salesError } = await supabase
            .from('sales')
            .delete()
            .eq('client_id', clientId);
        if (salesError) console.warn('Error al eliminar ventas:', salesError.message); // No es crítico

        // 4. Eliminar todas las citas asociadas al cliente
        const { error: apptError } = await supabase
            .from('appointments')
            .delete()
            .eq('user_id', clientId);
        // Si hay un error aquí (ej. RLS), el resto fallará, lo cual es bueno.
        if (apptError) throw new Error(`Error al eliminar citas: ${apptError.message}`);

        // 5. Eliminar todas las mascotas del cliente
        if (petIds.length > 0) {
            const { error: petDeleteError } = await supabase
                .from('pets')
                .delete()
                .in('id', petIds);
            if (petDeleteError) throw new Error(`Error al eliminar mascotas: ${petDeleteError.message}`);
        }

        // 6. Finalmente, eliminar el perfil del cliente
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', clientId);
        if (profileError) throw new Error(`Error al eliminar el perfil: ${profileError.message}`);

        return { success: true };

    } catch (error) {
        console.error('Error en el proceso de eliminación del cliente:', error);
        return { success: false, error };
    }
};


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
 * MODIFICADO: Acepta un saleDate opcional para registrar ventas pasadas
 */
export const addSale = async (saleData, saleDate = null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: { message: 'Usuario no autenticado' } };

    // Determinar el timestamp de la venta
    const saleTimestamp = saleDate 
        ? new Date(`${saleDate}T12:00:00`).toISOString() // Usa el mediodía de la fecha seleccionada para evitar problemas de zona horaria
        : new Date().toISOString(); // Usa la fecha y hora actual si no se proporciona

    const salesRecords = saleData.items.map(item => ({
        client_id: saleData.client_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.subtotal,
        // **** INICIO DE LA CORRECCIÓN ****
        payment_method: (saleData.payment_method || 'DESCONOCIDO').toUpperCase(),
        // **** FIN DE LA CORRECCIÓN ****
        recorded_by: user?.id || null,
        created_at: saleTimestamp // <-- CAMPO AÑADIDO
    }));
    
    const { data, error: saleError } = await supabase
        .from('sales')
        .insert(salesRecords)
        .select();
    
    if (saleError) {
        console.error('Error al guardar venta:', saleError);
        return { success: false, error: saleError };
    }

    // La lógica de actualización de stock permanece igual
    for (const item of saleData.items) {
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

        if (productError) {
            console.error('Error al obtener stock para actualizar:', productError);
            continue;
        }

        const newStock = product.stock - item.quantity;
        const { error: updateStockError } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.product_id);

        if (updateStockError) {
            console.error('Error al actualizar el stock:', updateStockError);
        }
    }

    return { success: true };
};

export const getPetsNeedingAppointment = async () => {
    const { data: pets, error } = await supabase
        .from('pets')
        .select(`
            id,
            name,
            image_url,
            owner_id,
            last_grooming_date,
            reminder_frequency_days,
            profiles (
                first_name,
                last_name,
                full_name
            )
        `)
        .not('last_grooming_date', 'is', null)
        .not('reminder_frequency_days', 'is', null);

    if (error) {
        console.error('Error al obtener mascotas para recordatorios:', error);
        return [];
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const petsNeedingCare = pets.filter(pet => {
        const lastGrooming = new Date(pet.last_grooming_date + 'T00:00:00');
        const nextAppointmentDate = new Date(lastGrooming);
        nextAppointmentDate.setDate(lastGrooming.getDate() + pet.reminder_frequency_days);
        
        return nextAppointmentDate <= today;
    });

    return petsNeedingCare;
};

/**
 * Actualiza una fila de venta individual en la base de datos
 */
export const updateSaleItem = async (saleId, updates) => {
    // **** INICIO DE LA CORRECCIÓN ****
    // Asegurarse de que el payment_method se actualice en MAYÚSCULAS
    if (updates.payment_method) {
        updates.payment_method = updates.payment_method.toUpperCase();
    }
    // **** FIN DE LA CORRECCIÓN ****

    const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', saleId)
        .select();

    if (error) {
        console.error('Error al actualizar el item de venta:', error);
        return { success: false, error };
    }
    return { success: true, data: data[0] };
};

/**
 * NUEVA FUNCIÓN: Obtiene todos los datos denormalizados para exportación.
 * CORRECCIÓN: Se elimina 'created_at' de la consulta de profiles.
 */
export const getAllDenormalizedDataForExport = async () => {
    try {
        const [
            clientsRes,
            petsRes,
            appointmentsRes,
            salesRes,
            complaintsRes,
        ] = await Promise.all([
            // Clientes (Profiles)
            supabase
                .from('profiles')
                .select(`
                    first_name, last_name, full_name, email, phone, district, doc_type, doc_num, emergency_contact_name, emergency_contact_phone,
                    role
                `)
                .eq('role', 'cliente'),
            
            // Mascotas (Pets)
            supabase
                .from('pets')
                .select(`
                    name, breed, species, size, weight, sex, observations, birth_date, reminder_frequency_days, last_grooming_date,
                    profiles ( full_name, phone )
                `),
            
            // Citas (Appointments)
            supabase
                .from('appointments')
                .select(`
                    appointment_date, appointment_time, service, status, final_observations, final_weight, service_price, payment_method, shampoo_type,
                    pets ( name ),
                    profiles ( full_name )
                `),
                
            // Ventas (Sales)
            supabase
                .from('sales')
                .select(`
                    created_at, total_price, quantity, payment_method,
                    client:client_id ( full_name, phone ),
                    product:product_id ( name, category )
                `),
                
            // Reclamos (Complaints)
            supabase
                .from('complaints')
                .select(`
                    created_at, status, doc_type, doc_num, first_name, last_name, mother_last_name, email, phone, district, bien_contratado, monto, description, tipo_reclamo, detalle_reclamo, pedido
                `),
        ]);

        if (clientsRes.error) throw clientsRes.error;
        if (petsRes.error) throw petsRes.error;
        if (appointmentsRes.error) throw appointmentsRes.error;
        if (salesRes.error) throw salesRes.error;
        if (complaintsRes.error) throw complaintsRes.error;

        // Limpiar y denormalizar la estructura de los datos para la exportación.
        const cleanedPets = petsRes.data.map(pet => ({
            'Nombre Mascota': pet.name,
            'Raza': pet.breed,
            'Especie': pet.species,
            'Tamaño': pet.size,
            'Peso (kg)': pet.weight,
            'Sexo': pet.sex,
            'Fecha Nacimiento': pet.birth_date,
            'Dueño': pet.profiles?.full_name,
            'Frecuencia Recordatorio (días)': pet.reminder_frequency_days,
            'Último Servicio': pet.last_grooming_date,
            'Observaciones': pet.observations,
        }));
        
        const cleanedAppointments = appointmentsRes.data.map(apt => ({
            'Cliente': apt.profiles?.full_name,
            'Mascota': apt.pets?.name,
            'Fecha Cita': apt.appointment_date,
            'Hora Cita': apt.appointment_time,
            'Servicio Solicitado': apt.service,
            'Estado': apt.status,
            'Precio Servicio (S/)': apt.service_price,
            // **** INICIO DE LA CORRECCIÓN ****
            'Método Pago': (apt.payment_method || 'DESCONOCIDO').toUpperCase(),
            // **** FIN DE LA CORRECCIÓN ****
            'Peso Final (kg)': apt.final_weight,
            'Shampoo Utilizado': apt.shampoo_type,
            'Observaciones Finales': apt.final_observations,
        }));

        const cleanedSales = salesRes.data.map(sale => ({
            'Fecha Venta': new Date(sale.created_at).toLocaleString('es-ES'),
            'Cliente': sale.client?.full_name,
            'Producto': sale.product?.name,
            'Categoría Producto': sale.product?.category,
            'Cantidad': sale.quantity,
            'Precio Total (S/)': sale.total_price,
            // **** INICIO DE LA CORRECCIÓN ****
            'Método Pago': (sale.payment_method || 'DESCONOCIDO').toUpperCase(),
            // **** FIN DE LA CORRECCIÓN ****
        }));


        return {
            clients: clientsRes.data,
            pets: cleanedPets,
            appointments: cleanedAppointments,
            sales: cleanedSales,
            complaints: complaintsRes.data
        };
        
    } catch (error) {
        console.error('Error general al obtener datos para exportar:', error);
        return { error: error.message };
    }
};

export { supabase };