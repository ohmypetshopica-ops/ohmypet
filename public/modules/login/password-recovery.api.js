// public/modules/login/password-recovery.api.js

import { supabase } from '../../core/supabase.js';

/**
 * Solicita a Supabase que envíe un correo de recuperación de contraseña.
 * @param {string} email - El correo electrónico del usuario.
 * @returns {Promise<Object>} El resultado de la operación.
 */
export const recoverPassword = async (email) => {
    // La URL de redirección ahora apunta a la nueva página de actualización de contraseña.
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:5500/public/modules/login/update-password.html'
    });

    if (error) {
        console.error('Error al solicitar recuperación de contraseña:', error);
        return { success: false, error };
    }
    return { success: true, data };
};