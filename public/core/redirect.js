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
            if (profile.role === 'dueño' || profile.role === 'empleado') {
                // Usuarios admin van al dashboard
                window.location.href = '/public/modules/dashboard/dashboard-overview.html';
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