/* ==========================================================================
   PetBikroy — account settings

   Two independent forms: the public profile and the password. Both send a
   whole object, and both show per-field messages the server sent back, so the
   rules live in one place (functions/_lib/validate.js) rather than being
   duplicated here.
   ========================================================================== */

(() => {
  'use strict';

  const { $, esc } = UI;

  UI.mountChrome();
  $('#crumbs').innerHTML = UI.crumbs([
    { label: 'Home', href: 'index.html' },
    { label: 'My account' },
  ]);

  const body = $('#acctBody');
  const profileForm = $('#profileForm');
  const passwordForm = $('#passwordForm');
  const pLoc = $('#pLocation');
  const pArea = $('#pArea');

  const L = UI.LIMITS;

  // The markup carries maxlength attributes as a no-JS fallback; the shared
  // constants are the real mirror of the server's rules, so they win.
  $('#pName').maxLength = L.NAME_MAX;
  $('#pEmail').maxLength = 160;
  $('#pBio').maxLength = L.BIO_MAX;
  $('#newPw').maxLength = L.PASSWORD_MAX;
  $('#confirmPw').maxLength = L.PASSWORD_MAX;

  /* --------------------------------------------------------- division/area */

  pLoc.innerHTML = '<option value="">Choose a division</option>'
    + PB.LOCATIONS.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');

  /** Rebuilds the area list for a division, keeping `keep` selected. */
  function fillAreas(locId, keep = '') {
    const loc = PB.LOCATIONS.find(l => l.id === locId);
    pArea.disabled = !loc;
    pArea.innerHTML = !loc
      ? '<option value="">Choose a division first</option>'
      : '<option value="">Choose an area</option>'
        + loc.areas.map(a =>
            `<option value="${esc(a)}"${a === keep ? ' selected' : ''}>${esc(a)}</option>`
          ).join('');
  }

  pLoc.addEventListener('change', () => fillAreas(pLoc.value));

  /* --------------------------------------------------------------- alerts */

  function setAlert(host, message, ok = false) {
    host.textContent = message;
    host.classList.toggle('is-ok', ok);
    host.classList.remove('hide');
  }

  const clearAlert = host => { host.classList.add('hide'); host.textContent = ''; };

  function fieldError(form, name, message) {
    const msg = form.querySelector(`[data-err="${name}"]`);
    if (msg) {
      msg.textContent = message || '';
      msg.classList.toggle('show', Boolean(message));
    }
    msg?.closest('.field')?.classList.toggle('field-error', Boolean(message));
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('.err-msg').forEach(m => {
      m.textContent = '';
      m.classList.remove('show');
    });
    form.querySelectorAll('.field-error').forEach(f => f.classList.remove('field-error'));
  }

  /** Paints server-side field errors (a 400 from assertValid carries them). */
  function paintErrors(form, err) {
    for (const [field, message] of Object.entries(err.details || {})) {
      fieldError(form, field, message);
    }
  }

  /* ------------------------------------------------------------------ fill */

  function fill() {
    const u = API.user;
    if (!u) return;

    $('#acctAvatar').textContent = UI.initials(u.name);
    $('#acctName').textContent = u.name;
    $('#acctPhone').textContent = u.phone;

    const facts = [`📞 ${u.phone}`];
    if (u.area) facts.push(`📍 ${u.area}`);
    else if (u.loc) facts.push(`📍 ${PB.locName(u.loc)}`);
    if (u.joined) facts.push(`🗓️ Joined ${PB.formatDate(u.joined)}`);
    const live = Number(u.ads) || 0;
    facts.push(`${live} live ${live === 1 ? 'ad' : 'ads'}`);
    if (u.verified) facts.push('✅ Verified seller');
    $('#acctMeta').innerHTML = facts.map(esc).join(' &nbsp;·&nbsp; ');

    $('#pName').value = u.name || '';
    $('#pEmail').value = u.email || '';
    $('#pBio').value = u.bio || '';
    pLoc.value = u.loc || '';
    fillAreas(u.loc || '', u.area || '');

    body.classList.remove('hide');
  }

  /* ------------------------------------------------------------------ gate */

  API.ready.then(() => {
    if (!API.available) {
      body.classList.remove('hide');
      body.innerHTML = `<div class="card acct-section">
        <h2>Accounts need the live site</h2>
        <p class="hint">This copy of PetBikroy is running without a backend, so
        there is no account to manage. You can still browse and post ads locally.</p>
        <a class="btn btn-primary" href="index.html">Back to the homepage</a>
      </div>`;
      return;
    }
    if (!API.user) {
      location.replace('login.html?next=account.html');
      return;
    }
    fill();
  });

  // Signing out from the drawer while this page is open.
  document.addEventListener('pb:signedout', () => location.replace('index.html'));

  /* --------------------------------------------------------------- profile */

  profileForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert($('#profileAlert'));
    clearFieldErrors(profileForm);

    const name = $('#pName').value.trim();
    if (name.length < L.NAME_MIN) {
      fieldError(profileForm, 'name', 'Enter your name.');
      return;
    }

    const btn = $('#profileBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      await API.updateProfile({
        name,
        email: $('#pEmail').value.trim(),
        bio: $('#pBio').value.trim(),
        locationId: pLoc.value,
        area: pArea.value,
      });
      UI.updateAccountUI();
      fill();
      UI.toast('Profile saved', 'ok');
      setAlert($('#profileAlert'), 'Your profile is up to date.', true);
    } catch (err) {
      paintErrors(profileForm, err);
      setAlert($('#profileAlert'), err.message || 'That did not save.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save profile';
    }
  });

  /* -------------------------------------------------------------- password */

  passwordForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert($('#passwordAlert'));
    clearFieldErrors(passwordForm);

    const current = $('#curPw').value;
    const next = $('#newPw').value;
    const confirm = $('#confirmPw').value;

    let bad = false;
    if (!current) { fieldError(passwordForm, 'currentPassword', 'Enter your current password.'); bad = true; }
    if (next.length < L.PASSWORD_MIN) {
      fieldError(passwordForm, 'newPassword', `Use at least ${L.PASSWORD_MIN} characters.`); bad = true;
    }
    if (next !== confirm) {
      fieldError(passwordForm, 'confirmPassword', 'The two passwords do not match.'); bad = true;
    }
    if (bad) return;

    const btn = $('#passwordBtn');
    btn.disabled = true;
    btn.textContent = 'Changing…';

    try {
      await API.changePassword(current, next);
      passwordForm.reset();
      setAlert(
        $('#passwordAlert'),
        'Password changed. Any other device signed in to this account has been signed out.',
        true,
      );
      UI.toast('Password changed', 'ok');
    } catch (err) {
      paintErrors(passwordForm, err);
      setAlert($('#passwordAlert'), err.message || 'That did not work.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Change password';
    }
  });

  /* ------------------------------------------------------------- sign out */

  $('#signOutBtn').addEventListener('click', async () => {
    await UI.signOut();
    location.replace('index.html');
  });
})();
