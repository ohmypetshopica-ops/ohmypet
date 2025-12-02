// public/modules/dashboard/sales.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene el historial completo de ventas, incluyendo datos del cliente y producto.
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
 * Registra una nueva venta con múltiples ítems.
 * Maneja la lógica de descontar stock de los productos vendidos.
 */
export const addSale = async (saleData, saleDate = null) => {
    // Verificar usuario autenticado (quién registra la venta)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: { message: 'Usuario no autenticado' } };

    // Determinar la fecha de la venta (manual o actual)
    const saleTimestamp = saleDate 
        ? new Date(`${saleDate}T12:00:00`).toISOString() 
        : new Date().toISOString();

    // Preparar los registros para insertar en la tabla 'sales'
    const salesRecords = saleData.items.map(item => ({
        client_id: saleData.client_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.subtotal,
        payment_method: (saleData.payment_method || 'DESCONOCIDO').toUpperCase(),
        notes: item.note || null, 
        recorded_by: user?.id || null,
        created_at: saleTimestamp
    }));
    
    // Insertar venta
    const { data, error: saleError } = await supabase
        .from('sales')
        .insert(salesRecords)
        .select();
    
    if (saleError) {
        console.error('Error al guardar venta:', saleError);
        return { success: false, error: saleError };
    }

    // Actualizar stock de productos (iterando sobre cada ítem vendido)
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

/**
 * Actualiza un ítem de venta específico (ej: cambiar método de pago o cantidad).
 */
export const updateSaleItem = async (saleId, updates) => {
    if (updates.payment_method) {
        updates.payment_method = updates.payment_method.toUpperCase();
    }

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
 * Genera datos agregados para reportes financieros basados en un rango de fechas.
 * Retorna ingresos por servicios (Appointments).
 */
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

        const method = (service.payment_method || 'DESCONOCIDO').toUpperCase();

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
           metodo_pago: (service.payment_method || 'DESCONOCIDO').toUpperCase(),
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
 * Genera datos agregados para reportes de Ventas de Productos.
 */
export const getSalesReportData = async (startDate, endDate) => {
    
    const startDateTime = new Date(startDate + 'T00:00:00');
    const endDateObj = new Date(endDate + 'T00:00:00');
    endDateObj.setDate(endDateObj.getDate() + 1); // Incluir todo el día final
    const startISO = startDateTime.toISOString();
    const endISO = endDateObj.toISOString();

    const { data: sales, error } = await supabase
        .from('sales')
        .select(`
            created_at,
            total_price,
            quantity,
            payment_method,
            notes,
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
        
        const method = (sale.payment_method || 'DESCONOCIDO').toUpperCase();

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
            nota: sale.notes || '',
            categoria: sale.product?.category || 'N/A',
            cantidad: sale.quantity,
            metodo_pago: (sale.payment_method || 'DESCONOCIDO').toUpperCase(),
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