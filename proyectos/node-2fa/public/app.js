const accountForm = document.querySelector('#account-form');
const tokenForm = document.querySelector('#token-form');
const notice = document.querySelector('#notice');
const challenge = document.querySelector('#challenge');
const account = document.querySelector('#account');
let tokenAction = '/api/auth/enable-2fa';
let view = 'register';

function showMessage(message, error = false) { notice.textContent = message; notice.className = `notice ${error ? 'error' : 'success'}`; }
function showSetup(setup, action) {
  tokenAction = action;
  challenge.hidden = false;
  account.hidden = true;
  document.querySelector('#qr').hidden = false;
  document.querySelector('#secret').parentElement.hidden = false;
  document.querySelector('#qr').src = setup.qr;
  document.querySelector('#secret').textContent = setup.secret;
  document.querySelector('#token-button').textContent = 'Verificar y continuar';
  showMessage('Usa tu aplicación autenticadora y confirma con el código actual.');
}
function showAccount(email) {
  challenge.hidden = true;
  account.hidden = false;
  account.innerHTML = `<strong>Sesión activa</strong><span>${email.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span><button id="logout" class="secondary">Cerrar sesión</button>`;
  document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); account.hidden = true; accountForm.hidden = false; showMessage('Sesión cerrada.'); });
  accountForm.hidden = true;
}

document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab === button));
  accountForm.querySelector('button').textContent = view === 'register' ? 'Crear cuenta y configurar 2FA' : 'Continuar';
  accountForm.querySelector('[name="password"]').autocomplete = view === 'register' ? 'new-password' : 'current-password';
  accountForm.hidden = false; challenge.hidden = true; account.hidden = true;
}));

accountForm.addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(accountForm));
  const endpoint = view === 'register' ? '/api/auth/register' : '/api/auth/login';
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await response.json();
    if (!response.ok) return showMessage(data.error, true);
    if (data.setup) return showSetup(data.setup, '/api/auth/enable-2fa');
    if (data.requiresTotp) { tokenAction = '/api/auth/verify-2fa'; challenge.hidden = false; document.querySelector('#qr').hidden = true; document.querySelector('#secret').parentElement.hidden = true; document.querySelector('#token-button').textContent = 'Verificar código'; showMessage(data.message); return; }
    showAccount(data.email);
  } catch { showMessage('No fue posible conectar con el servidor local.', true); }
});

tokenForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const response = await fetch(tokenAction, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: new FormData(tokenForm).get('token') }) });
    const data = await response.json();
    if (!response.ok) return showMessage(data.error, true);
    accountForm.hidden = true;
    showAccount(data.email);
    showMessage(data.message);
  } catch { showMessage('No fue posible conectar con el servidor local.', true); }
});

