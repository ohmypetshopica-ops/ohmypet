// public/core/redirect.js

import { supabase } from './supabase.js';

const redirectToDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, onboarding_completed')
            .eq('id', user.id)
            .single();

        if (profile) {
            // AQUÍ ESTÁ LA CORRECCIÓN
            if (profile.role === 'dueño') {
                // Dueños van al dashboard de administrador
                window.location.href = '/public/modules/dashboard/dashboard-overview.html';
            } else if (profile.role === 'empleado') {
                // Empleados van a su nuevo dashboard móvil
                window.location.href = '/public/modules/employee/dashboard.html';
            } else if (profile.role === 'cliente') {
                // Clientes verifican onboarding
                if (profile.onboarding_completed) {
                    window.location.href = '/public/index.html';
                } else {
                    window.location.href = '/public/modules/profile/onboarding.html';
                }
            } else {
                // Rol desconocido va al inicio
                window.location.href = '/public/index.html';
            }
        }
    }
};

export { redirectToDashboard };