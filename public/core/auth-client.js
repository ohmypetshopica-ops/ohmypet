// core/auth-client.js

import { supabase } from './supabase.js';

const checkUserSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Si no hay usuario logueado, redirige al login de clientes
        window.location.href = '/public/modules/login/client-login.html';
    }
};

checkUserSession();