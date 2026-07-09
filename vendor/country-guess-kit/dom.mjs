export const $ = id => document.getElementById(id);

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

export function populateDatalist(element, items, getLabel = item => item.name) {
  element.innerHTML = items.map(item => `<option value="${escapeHtml(getLabel(item))}"></option>`).join('');
}

export function bindGuessForm({ input, button, onSubmit }) {
  button?.addEventListener('click', onSubmit);
  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') onSubmit(event);
  });
}

export function setDisabled(elements, disabled) {
  elements.filter(Boolean).forEach(element => { element.disabled = disabled; });
}
