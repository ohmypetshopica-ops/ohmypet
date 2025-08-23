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
        alert('Inicio de sesión exitoso, pero no pudimos verificar tu rol. Serás dirigido a la tienda.');
        window.location.href = 'tienda.html';
        return;
    }

    // 3. Redirigir al usuario basado en su rol
    const userRole = roleData ? roleData.role : null;

    if (userRole === 'dueno' || userRole === 'empleado') {
        // Si es dueño o empleado, va al dashboard de administración
        alert('¡Inicio de sesión de administrador exitoso!');
        window.location.href = 'dashboard.html';
    } else {
        // Si es cliente o no tiene un rol definido, va a la tienda
        alert('¡Inicio de sesión exitoso!');
        window.location.href = 'tienda.html';
    }
});