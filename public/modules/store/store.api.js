// public/modules/store/store.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Obtiene todos los productos de la tabla 'products' que están en stock.
 * @returns {Promise<Array<Object>>} Lista de productos.
 */
export const getStoreProducts = async () => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0); // Solo trae productos con stock mayor a 0

    if (error) {
        console.error('Error al obtener productos para la tienda:', error);
        return [];
    }
    return data;
};