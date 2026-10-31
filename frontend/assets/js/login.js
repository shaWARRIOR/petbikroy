/* ==========================================================================
   PetBikroy — sign in

   The session is an HttpOnly cookie, so this page's only job is to hand the
   credentials to the API once and then leave them alone. Nothing is stored in
   the browser.
   ========================================================================== */

(() => {
  'use strict';

  const { $ } = UI;

  UI.mountChrome();
  $('#crumbs').innerHTML = UI.crumbs([
    { label: 'Home', href: 'index.html' },
    { label: 'Sign in' },
  ]);

  const form = $('#loginForm');
  const alertBox = $('#formAlert');
  const submit = $('#submitBtn');

  function showAlert(message, ok = false) {
    alertBox.textContent = message;
    alertBox.classList.toggle('is-ok', ok);
    alertBox.classList.remove('hide');
  }

  function fieldError(name, message) {
    const msg = form.querySelector(`[data-err="${name}"]`);
    const field = form.querySelector(`[name="${name}"]`)?.closest('.field');
    if (msg) {
      msg.textContent = message || '';
      msg.classList.toggle('show', Boolean(message));
    }
    field?.classList.toggle('field-error', Boolean(message));
  }

  function clearErrors() {
    alertBox.classList.add('hide');
    ['phone', 'password'].forEach(name => fieldError(name, ''));
  }

  /* The `?next=` parameter decides where to go afterwards. */
  const destination = () => UI.safeNext();

  API.ready.then(() => {
    // Already signed in — there is nothing to do on this page.
    if (API.user) {
      location.replace(destination());
      return;
    }
    if (!API.available) {
      showAlert(
        'Signing in needs the live site. This copy is running without a '
        + 'backend, so any ads you post stay in this browser only.',
      );
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();

    const phone = $('#phone').value.trim();
    const password = $('#password').value;

    if (!phone) return fieldError('phone', 'Enter your mobile number.');
    if (!password) return fieldError('password', 'Enter your password.');

    submit.disabled = true;
    submit.textContent = 'Signing in…';

    try {
      await API.login(phone, password);
      UI.updateAccountUI();
      location.replace(destination());
    } catch (err) {
      for (const [field, message] of Object.entries(err.details || {})) {
        fieldError(field, message);
      }
      showAlert(err.message || 'That did not work. Please try again.');
      submit.disabled = false;
      submit.textContent = 'Sign in';
    }
  });
})();
