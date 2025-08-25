import { supabase } from '../../supabase-client.js';

export async function getStockBajo(threshold=5){
  const { data, error } = await supabase.from('productos')
    .select('id, stock').lt('stock', threshold);
  if (error) throw error;
  return data?.length ?? 0;
}
export async function listProductos(){
  const { data, error } = await supabase.from('productos')
    .select('*').order('created_at', { ascending:false });
  if (error) throw error;
  return data||[];
}
export async function getProducto(id){
  const { data, error } = await supabase.from('productos')
    .select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function createProducto(payload){
  const { error } = await supabase.from('productos').insert([payload]);
  if (error) throw error;
}
export async function updateProducto(id,payload){
  const { error } = await supabase.from('productos').update(payload).eq('id', id);
  if (error) throw error;
}
export async function deleteProducto(id){
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) throw error;
}
