// core/auth.js

import { supabase } from './supabase.js';

const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error || (profile && profile.role === 'cliente')) {
        // Si hay error o es un cliente, lo desloguea y lo saca (sin alerta)
        await supabase.auth.signOut();
        window.location.href = '/public/modules/login/login.html';
    }
};

checkUserRole();