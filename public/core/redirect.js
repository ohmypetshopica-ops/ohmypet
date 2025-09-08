// public/core/redirect.js

import { supabase } from '../modules/login/login.api.js';

const redirectToDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile && (profile.role === 'dueño' || profile.role === 'empleado')) {
            window.location.href = '/public/modules/dashboard/dashboard.html';
        } else {
            window.location.href = '/public/index.html';
        }
    }
};

export { redirectToDashboard };