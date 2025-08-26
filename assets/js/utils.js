// assets/js/utils.js
export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function formToObject(form) {
  const fd = new FormData(form);
  const obj = Object.fromEntries(fd.entries());
  qsa('input[type="number"]', form).forEach(inp => {
    if (inp.name in obj && obj[inp.name] !== '') obj[inp.name] = Number(obj[inp.name]);
  });
  qsa('select[data-bool]', form).forEach(sel => {
    obj[sel.name] = sel.value === '1';
  });
  return obj;
}

export function renderTable(tbody, rows, columns, actions = {}) {
  tbody.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    tr.innerHTML = `
      ${columns.map(c => `<td class="p-2 text-sm">${escapeHtml(String(r[c] ?? ''))}</td>`).join('')}
      ${actions.edit || actions.del ? `
        <td class="p-2 text-sm flex gap-2">
          ${actions.edit ? `<button data-edit="${r.id}" class="px-2 py-1 border rounded">Editar</button>` : ''}
          ${actions.del ? `<button data-del="${r.id}" class="px-2 py-1 border rounded">Eliminar</button>` : ''}
        </td>` : ''
      }
    `;
    tbody.appendChild(tr);
  }
  if (actions.edit) {
    qsa('[data-edit]').forEach(b => b.addEventListener('click', () => actions.edit(b.dataset.edit)));
  }
  if (actions.del) {
    qsa('[data-del]').forEach(b => b.addEventListener('click', () => actions.del(b.dataset.del)));
  }
}

export function setForm(form, data) {
  Object.entries(data).forEach(([k, v]) => {
    if (k in form) form[k].value = v ?? '';
  });
}

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Modal simple (opcional)
export function confirmDialog(msg) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 bg-black/30 flex items-center justify-center z-50';
    wrap.innerHTML = `
      <div class="bg-white rounded-xl shadow w-[360px] p-4">
        <p class="text-sm mb-4">${escapeHtml(msg)}</p>
        <div class="flex gap-2 justify-end">
          <button id="c-no" class="px-3 py-1 border rounded">Cancelar</button>
          <button id="c-yes" class="px-3 py-1 border rounded bg-gray-100">Aceptar</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    qs('#c-no', wrap).onclick = () => { wrap.remove(); resolve(false); };
    qs('#c-yes', wrap).onclick = () => { wrap.remove(); resolve(true); };
  });
}
