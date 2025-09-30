// core/auth-client.js

import { supabase } from './supabase.js';

const checkUserSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Si no hay usuario logueado, redirige al login de clientes
        // CORRECCIÓN: Apuntamos al archivo correcto "login.html"
        window.location.href = '/public/modules/login/login.html';
    }
};

checkUserSession();