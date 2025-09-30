import { supabase } from '../../core/supabase.js';

const complaintForm = document.querySelector('#complaint-form');
const submitButton = complaintForm.querySelector('button[type="submit"]');

complaintForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    const formData = new FormData(complaintForm);
    const complaintData = {
        doc_type: formData.get('doc_type'),
        doc_num: formData.get('doc_num'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        mother_last_name: formData.get('mother_last_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        district: formData.get('district'),
        bien_contratado: formData.get('bien_contratado'),
        monto: parseFloat(formData.get('monto')) || null,
        description: formData.get('description'),
        tipo_reclamo: formData.get('tipo_reclamo'),
        detalle_reclamo: formData.get('detalle_reclamo'),
        pedido: formData.get('pedido')
    };

    const { error } = await supabase.from('complaints').insert([complaintData]);

    if (error) {
        alert('Hubo un error al enviar tu reclamo. Por favor, inténtalo de nuevo.\nError: ' + error.message);
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar';
    } else {
        alert('¡Tu reclamo ha sido enviado con éxito! Te responderemos en el plazo indicado.');
        complaintForm.reset();
        submitButton.textContent = 'Enviado ✔️';
        setTimeout(() => {
            window.location.href = '/public/index.html';
        }, 3000);
    }
});