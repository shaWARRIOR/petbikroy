/* ==========================================================================
   PetBikroy — create an account

   The mobile number is both the login identifier and the number buyers ring,
   so it is the one field that really matters. Everything except name, phone
   and password can be filled in later from the account page.
   ========================================================================== */

(() => {
  'use strict';

  const { $, esc } = UI;

  UI.mountChrome();
  $('#crumbs').innerHTML = UI.crumbs([
    { label: 'Home', href: 'index.html' },
    { label: 'Create an account' },
  ]);

  const form = $('#registerForm');
  const alertBox = $('#formAlert');
  const submit = $('#submitBtn');
  const locSel = $('#locationId');
  const areaSel = $('#area');

  const L = UI.LIMITS;

  // The markup carries maxlength attributes as a no-JS fallback; the shared
  // constants are the real mirror of the server's rules, so they win.
  $('#name').maxLength = L.NAME_MAX;
  $('#email').maxLength = 160;
  $('#password').maxLength = L.PASSWORD_MAX;
  $('#confirm').maxLength = L.PASSWORD_MAX;

  /* -------------------------------------------------------- division/area */

  locSel.innerHTML = '<option value="">Choose a division</option>'
    + PB.LOCATIONS.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');

  locSel.addEventListener('change', () => {
    const loc = PB.LOCATIONS.find(l => l.id === locSel.value);
    if (!loc) {
      areaSel.innerHTML = '<option value="">Choose a division first</option>';
      areaSel.disabled = true;
      return;
    }
    areaSel.disabled = false;
    areaSel.innerHTML = '<option value="">Choose an area</option>'
      + loc.areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
  });

  /* ------------------------------------------------------------- messaging */

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

  const FIELDS = ['name', 'phone', 'email', 'password', 'confirm', 'locationId', 'area'];

  function clearErrors() {
    alertBox.classList.add('hide');
    FIELDS.forEach(name => fieldError(name, ''));
  }

  /* ------------------------------------------------------------------ boot */

  API.ready.then(() => {
    if (API.user) {
      location.replace(UI.safeNext());
      return;
    }
    if (!API.available) {
      showAlert('Creating an account needs the live site. This copy is running without a backend.');
      submit.disabled = true;
    }
  });

  /* ---------------------------------------------------------------- submit */

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors();

    const values = {
      name: $('#name').value.trim(),
      phone: $('#phone').value.trim(),
      email: $('#email').value.trim(),
      password: $('#password').value,
      locationId: locSel.value,
      area: areaSel.value,
    };

    const confirm = $('#confirm').value;

    // Cheap checks first so an obvious mistake does not need a round trip.
    let bad = false;
    if (values.name.length < L.NAME_MIN) { fieldError('name', 'Enter your name.'); bad = true; }
    if (!values.phone) { fieldError('phone', 'Enter your mobile number.'); bad = true; }
    if (values.password.length < L.PASSWORD_MIN) {
      fieldError('password', `Use at least ${L.PASSWORD_MIN} characters.`); bad = true;
    }
    if (values.password !== confirm) {
      fieldError('confirm', 'The two passwords do not match.'); bad = true;
    }
    if (bad) return;

    submit.disabled = true;
    submit.textContent = 'Creating your account…';

    try {
      await API.register({ ...values, confirm });
      UI.updateAccountUI();
      UI.toast('Welcome to PetBikroy!', 'ok');
      location.replace(UI.safeNext('post.html'));
    } catch (err) {
      for (const [field, message] of Object.entries(err.details || {})) {
        fieldError(field, message);
      }
      showAlert(err.message || 'That did not work. Please try again.');
      submit.disabled = false;
      submit.textContent = 'Create account';
    }
  });
})();
