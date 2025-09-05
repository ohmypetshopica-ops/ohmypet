// core/auth.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://halhpbhglyouufmveqic.supabase.co'; // Pega aquí tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGhwYmhnbHlvdXVmbXZlcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODA5MTMsImV4cCI6MjA3MjY1NjkxM30.Rjvm_ujTXveNyYrF5ZKqsdFsV4-_SsGYKyo8bSS8wT4';   // Pega aquí tu clave anónima
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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