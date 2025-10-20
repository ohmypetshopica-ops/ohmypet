// public/core/auth-employee.js

import { supabase } from './supabase.js';

const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Si no hay usuario, redirigir al login principal
    if (!user) {
        window.location.href = '/public/modules/login/login.html';
        return;
    }

    // 2. Obtener el perfil del usuario para verificar su rol
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // 3. Si hay un error o el rol NO es 'empleado', sacarlo de la página
    if (error || !profile || profile.role !== 'empleado') {
        await supabase.auth.signOut();
        window.location.href = '/public/modules/login/login.html';
    }
    
    // 4. Si es empleado, puede quedarse. Opcional: imprimir un mensaje de bienvenida.
    console.log('✅ Acceso de empleado verificado. ¡Bienvenido!');
};

// Ejecutar la verificación inmediatamente
checkUserRole();