// public/modules/dashboard/products.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene el conteo total de productos (para estadísticas del dashboard).
 */
export const getProductsCount = async () => {
    const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
    if (error) console.error('Error al contar productos:', error);
    return count || 0;
};

/**
 * Obtiene una lista simple de todos los productos ordenados por nombre.
 * Útil para selectores o listas no paginadas.
 */
export const getProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (error) console.error('Error al obtener productos:', error);
    return data || [];
};

/**
 * Agrega un nuevo producto al inventario.
 */
export const addProduct = async (productData) => {
    const { error } = await supabase.from('products').insert([productData]);
    if (error) {
        console.error('Error al agregar producto:', error);
        return { success: false, error };
    }
    return { success: true };
};

/**
 * Actualiza los datos de un producto existente.
 */
export const updateProduct = async (productId, productData) => {
    const { error } = await supabase.from('products').update(productData).eq('id', productId);
    if (error) {
        console.error('Error al actualizar producto:', error);
        return { success: false, error };
    }
    return { success: true };
};

/**
 * Elimina un producto del inventario.
 */
export const deleteProduct = async (productId) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
        console.error('Error al eliminar producto:', error);
        return { success: false, error };
    }
    return { success: true };
};

/**
 * Obtiene productos paginados con filtros de búsqueda y categoría.
 * Usado en la tabla de gestión de productos del Dashboard.
 */
export const getProductsPaginated = async (page = 1, itemsPerPage = 10, search = '', category = '') => {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category) {
        query = query.eq('category', category);
    }

    query = query
        .order('name', { ascending: true })
        .range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('Error al obtener productos paginados:', error);
        return { data: [], count: 0 };
    }

    return { data: data || [], count: count || 0 };
};

/**
 * Obtiene productos paginados y optimizados para el Punto de Venta (POS).
 * Solo trae productos con stock > 0 y permite búsqueda rápida.
 */
export const getPOSProductsPaginated = async (page, limit, search = '') => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .gt('stock', 0); // Solo productos con stock

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(from, to);

    if (error) {
        console.error('Error al obtener productos para POS:', error);
        return { data: [], count: 0 };
    }

    return { data, count };
};