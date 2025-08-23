const loginForm = document.querySelector('#login-form');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    // 1. Iniciar sesión del usuario
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (authError) {
        // Mantenemos la alerta de error por si la contraseña o el email son incorrectos
        alert(`Error: ${authError.message}`);
        return;
    }

    // 2. Si el inicio de sesión es exitoso, obtener el rol del usuario
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

    if (roleError) {
        // Se ha quitado la alerta de aquí. Redirige directamente.
        window.location.href = 'tienda.html';
        return;
    }

    // 3. Redirigir al usuario basado en su rol
    const userRole = roleData ? roleData.role : null;

    if (userRole === 'dueno' || userRole === 'empleado') {
        // Se ha quitado la alerta. Redirige directamente al dashboard.
        window.location.href = 'dashboard.html';
    } else {
        // Se ha quitado la alerta. Redirige directamente al inicio.
        window.location.href = 'index.html';
    }
});