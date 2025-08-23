const loginForm = document.querySelector('#login-form');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = loginForm.email.value;
    const password = loginForm.password.value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert(`Error: ${error.message}`);
    } else {
        alert('¡Inicio de sesión exitoso!');
        window.location.href = 'dashboard.html';
    }
});