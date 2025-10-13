// --- FOTOS DE CITAS ---

/**
 * Obtiene las fotos asociadas a una cita.
 * @param {string} appointmentId - El ID de la cita.
 * @returns {Promise<Array>} La lista de fotos.
 */
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

/**
 * Sube una foto para una cita.
 * @param {string} appointmentId - El ID de la cita.
 * @param {File} file - El archivo de imagen a subir.
 * @param {'arrival' | 'departure'} photoType - El tipo de foto.
 * @returns {Promise<Object>} El resultado de la operación.
 */
export const uploadAppointmentPhoto = async (appointmentId, file, photoType) => {
    if (!file) return { success: false, error: { message: 'No se proporcionó ningún archivo.' } };

    const fileName = `public/${appointmentId}-${photoType}-${Date.now()}`;
    
    // 1. Subir el archivo al bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('appointment_images')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true // Sobrescribe si ya existe una foto con el mismo nombre
        });

    if (uploadError) {
        console.error('Error al subir la imagen:', uploadError);
        return { success: false, error: uploadError };
    }

    // 2. Obtener la URL pública de la imagen
    const { data: { publicUrl } } = supabase.storage
        .from('appointment_images')
        .getPublicUrl(fileName);

    // 3. Guardar la URL en la tabla 'appointment_photos'
    // Usamos 'upsert' para reemplazar la foto de llegada/salida si ya existe una.
    const { data: dbData, error: dbError } = await supabase
        .from('appointment_photos')
        .upsert({
            appointment_id: appointmentId,
            photo_type: photoType,
            image_url: publicUrl
        }, { onConflict: 'appointment_id, photo_type' }) // Clave única para el upsert
        .select();

    if (dbError) {
        console.error('Error al guardar la URL en la base de datos:', dbError);
        return { success: false, error: dbError };
    }

    return { success: true, data: dbData[0] };
};