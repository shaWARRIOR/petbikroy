/* ==========================================================================
   PetBikroy — "Post your ad" wizard
   Five steps, validated per step, saved to localStorage on publish.
   ========================================================================== */

(() => {
  'use strict';

  const { $, $$, esc } = UI;

  UI.mountChrome();
  $('#crumbs').innerHTML = UI.crumbs([
    { label: 'Home', href: 'index.html' },
    { label: 'Post your ad' },
  ]);

  /* ---------------------------------------------------------------- state */

  const draft = Wizard.blank();

  let step = 1;

  /* ------------------------------------------------------------ step chrome */

  function renderSteps() {
    $('#steps').innerHTML = Wizard.STEPS.map((s, i) => {
      const state = step === s.n ? 'is-active' : step > s.n ? 'is-done' : '';
      return `<div class="step ${state}" role="listitem">
          <span class="dot">${step > s.n ? '✓' : s.n}</span>
          <span class="lbl">${esc(s.label)}</span>
        </div>${i < Wizard.STEPS.length - 1 ? '<span class="step-line"></span>' : ''}`;
    }).join('');
  }

  function showStep(n) {
    step = n;
    $$('.wizard-panel').forEach(p => p.classList.toggle('is-active', Number(p.dataset.step) === n));
    renderSteps();

    $('#btnBack').disabled = n === 1;
    const next = $('#btnNext');
    const live = n >= 5;

    next.textContent = n === 4 ? 'Publish ad' : 'Continue ›';
    next.classList.toggle('btn-accent', n === 4);
    next.classList.toggle('btn-primary', n !== 4);
    $('#btnBack').classList.toggle('hide', live);
    next.classList.toggle('hide', live);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* --------------------------------------------------------- step 1: category */

  $('#catCards').innerHTML = PB.CATEGORIES.map(c => `
    <label class="radio-card">
      <input type="radio" name="catPick" value="${c.id}">
      <span class="rc-icon">${c.emoji}</span>
      <span class="rc-body"><span class="rc-title">${esc(c.name)}</span></span>
    </label>`).join('');

  $('#catCards').addEventListener('change', e => {
    const el = e.target.closest('input[name="catPick"]');
    if (!el) return;
    draft.cat = el.value;
    $$('#catCards .radio-card').forEach(c => c.classList.toggle('is-active', c.contains(el)));

    const cat = PB.catById(draft.cat);
    const sub = $('#fSub');
    sub.innerHTML = '<option value="">Choose…</option>' +
      cat.subs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    draft.sub = '';
    $('#subField').style.display = '';

    // Accessories, food and services have no age/gender/vaccination fields.
    $('#animalFields').classList.toggle('hide', !Wizard.isAnimalCategory(draft.cat));
  });

  $('#fSub').addEventListener('change', e => { draft.sub = e.target.value; });

  $$('input[name="kind"]').forEach(r => r.addEventListener('change', e => {
    draft.kind = e.target.value;
    $$('input[name="kind"]').forEach(x => x.closest('.radio-card').classList.toggle('is-active', x.checked));
    syncPriceField();
  }));

  function syncPriceField() {
    const free = draft.kind === 'adoption';
    $('#priceField').classList.toggle('hide', free);
  }

  /* ---------------------------------------------------------- step 2: details */

  // The HTML carries maxlength attributes as a no-JS fallback, but the
  // wizard's constants are the real mirror of the server's rules. Applying
  // them here means the markup and the API can never disagree about how much
  // text is allowed.
  for (const [sel, max] of [
    ['#fTitle', Wizard.TITLE_MAX],
    ['#fDesc', Wizard.DESC_MAX],
    ['#fAge', Wizard.AGE_MAX],
  ]) {
    const field = $(sel);
    if (field) field.maxLength = max;
  }

  $('#fTitle').addEventListener('input', e => {
    draft.title = e.target.value;
    $('#titleCount').textContent = draft.title.length;
  });

  $('#fDesc').addEventListener('input', e => {
    draft.desc = e.target.value;
    $('#descCount').textContent = draft.desc.length;
  });

  $('#fPrice').addEventListener('input', e => { draft.price = e.target.value === '' ? null : Number(e.target.value); });
  $('#fNegotiable').addEventListener('change', e => { draft.negotiable = e.target.checked; });
  $('#fAge').addEventListener('input', e => { draft.age = e.target.value; });
  $('#fCond').addEventListener('change', e => { draft.condition = e.target.value; });
  $('#fVax').addEventListener('change', e => { draft.vaccinated = e.target.checked; });

  $('#fGender').innerHTML = '<option value="">Not specified</option>' +
    PB.GENDERS.map(g => `<option value="${g}">${g}</option>`).join('');
  $('#fGender').addEventListener('change', e => { draft.gender = e.target.value; });

  /* ------------------------------------------------------------- photos */

  const MAX_PHOTOS = Wizard.MAX_PHOTOS;
  const MAX_BYTES = Wizard.MAX_BYTES;

  /* The preview grid shows data URLs, but publishing uploads the original
     File objects to R2 — base64 in localStorage would blow the quota after
     two or three photos. The two arrays are kept index-aligned. */
  const photoFiles = [];

  const drop = $('#dropzone');
  const input = $('#fPhotos');

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.remove('is-over');
  }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  input.addEventListener('change', e => { addFiles(e.target.files); input.value = ''; });

  const readAsDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => /^image\//.test(f.type || ''));
    if (!files.length) return;

    const room = Wizard.photoRoom(draft);
    if (room <= 0) { UI.toast(`Maximum ${MAX_PHOTOS} photos`, 'err'); return; }

    const accepted = [];
    for (const file of files.slice(0, room)) {
      if (file.size > MAX_BYTES) {
        UI.toast(`${file.name} is over ${Math.round(MAX_BYTES / 1024 / 1024)} MB — skipped`, 'err');
        continue;
      }
      accepted.push(file);
    }
    if (!accepted.length) return;

    // Read in parallel, then append in the order the user chose: the first
    // photo becomes the cover in search results.
    const previews = await Promise.all(accepted.map(readAsDataUrl));
    previews.forEach((src, i) => {
      draft.photos.push(src);
      photoFiles.push(accepted[i]);
    });
    renderPhotos();
  }

  function renderPhotos() {
    const host = $('#photoGrid');
    host.innerHTML = draft.photos.map((src, i) => `
      <div class="photo-item">
        <img src="${src}" alt="Photo ${i + 1}">
        ${i === 0 ? '<span class="primary-flag">Cover</span>' : ''}
        <button type="button" class="rm" data-rm="${i}" aria-label="Remove photo ${i + 1}">✕</button>
      </div>`).join('');

    $$('#photoGrid [data-rm]').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.rm);
      draft.photos.splice(i, 1);
      photoFiles.splice(i, 1);
      renderPhotos();
    }));

    const n = draft.photos.length;
    $('#photoHint').textContent = n === 0
      ? 'No photos yet — we will use a category illustration instead.'
      : `${n} photo${n > 1 ? 's' : ''} added. The first photo is the cover in search results.`;
  }

  /* --------------------------------------------------------- step 3: location */

  $('#fLocPick').innerHTML = '<option value="">Choose…</option>' +
    PB.LOCATIONS.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');

  $('#fLocPick').addEventListener('change', e => {
    draft.loc = e.target.value;
    draft.area = '';
    const l = PB.locById(draft.loc);
    $('#fArea').innerHTML = l
      ? '<option value="">Choose…</option>' + l.areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')
      : '<option value="">Choose division first</option>';
  });

  $('#fArea').addEventListener('change', e => { draft.area = e.target.value; });

  $('#fName').addEventListener('input', e => { draft.name = e.target.value; });
  $('#fPhone').addEventListener('input', e => {
    draft.phone = e.target.value.replace(/[^\d+]/g, '').slice(0, 14);
    e.target.value = draft.phone;
  });
  $('#fEmail').addEventListener('input', e => { draft.email = e.target.value; });

  // Pre-fill the location from the header picker.
  const pref = PB.getPrefLocation();
  if (pref && PB.locById(pref)) {
    $('#fLocPick').value = pref;
    $('#fLocPick').dispatchEvent(new Event('change'));
  }

  /* ------------------------------------------------------------- validation */

  function setError(fieldId, on) {
    const msg = document.getElementById('err-' + fieldId);
    if (!msg) return;
    msg.classList.toggle('show', on);
    // Highlight the whole field group so the user can see what to fix.
    const group = msg.closest('.field') || msg.parentElement;
    group?.classList.toggle('field-error', on);
  }

  function validate(n) {
    const { ok, errors } = Wizard.validateStep(n, draft, { terms: $('#fTerms').checked });
    errors.forEach(id => setError(id, true));
    return ok;
  }

  function clearErrors() {
    $$('.field-error').forEach(el => el.classList.remove('field-error'));
    $$('.err-msg').forEach(el => el.classList.remove('show'));
  }

  /* -------------------------------------------------------------- review UI */

  function buildPreview() {
    const free = draft.kind === 'adoption';
    const cover = draft.photos[0] ||
      PB.placeholder(PB.catEmoji(draft.cat), { n: 7, s: '#23a455' });

    const rows = [
      ['Category', `${PB.catEmoji(draft.cat)} ${PB.catName(draft.cat)} · ${draft.sub}`],
      ['Ad type', { sale: 'For sale', adoption: 'For adoption', service: 'Service or item' }[draft.kind]],
      ['Title', draft.title],
      ['Price', free ? 'Free (adoption)' : `${PB.SITE.currency}${PB.group(draft.price || 0)}${draft.negotiable ? ' (negotiable)' : ''}`],
      draft.age ? ['Age', draft.age] : null,
      draft.gender ? ['Gender', draft.gender] : null,
      ['Condition', draft.condition],
      ['Vaccinated', draft.vaccinated ? 'Yes' : 'No'],
      ['Location', `${draft.area}, ${PB.locName(draft.loc)}`],
      ['Contact', `${draft.name} · ${draft.phone}`],
      draft.email ? ['Email', draft.email] : null,
      ['Photos', draft.photos.length ? `${draft.photos.length} uploaded` : 'Using a category illustration'],
    ].filter(Boolean);

    $('#previewCard').innerHTML = `
      <div class="row gap-16" style="align-items:flex-start;flex-wrap:wrap">
        <img src="${cover}" alt="" style="width:190px;aspect-ratio:4/3;object-fit:cover;border-radius:10px;border:1px solid var(--line)">
        <div style="flex:1;min-width:220px">
          <div class="ad-price">${free ? 'Free' : `<span class="cur">${PB.SITE.currency}</span>${PB.group(draft.price || 0)}`}</div>
          <h3 style="margin:6px 0 4px">${esc(draft.title)}</h3>
          <div class="small muted row gap-8">${UI.icon('pin', 14)} ${esc(draft.area)}, ${esc(PB.locName(draft.loc))}</div>
          <div class="ad-tags mt-8">
            ${draft.gender ? `<span class="tag">${esc(draft.gender)}</span>` : ''}
            ${draft.age ? `<span class="tag">${esc(draft.age)}</span>` : ''}
            ${draft.vaccinated ? '<span class="tag tag-green">Vaccinated</span>' : ''}
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="review-list">
        ${rows.map(([k, v]) => `<div class="row-item"><span class="k">${esc(k)}</span>
          <span>${esc(v)}</span></div>`).join('')}
        <div class="row-item"><span class="k">Description</span>
          <span class="desc">${esc(draft.desc)}</span></div>
      </div>`;
  }

  /* ---------------------------------------------------------------- publish */

  /** Maps the wizard's draft onto the API's payload shape. */
  function toApiPayload(d, photos) {
    return {
      categoryId: d.cat,
      subcategory: d.sub,
      kind: d.kind,
      title: d.title,
      description: d.desc,
      price: Number(d.price) || 0,
      negotiable: !!d.negotiable,
      locationId: d.loc,
      area: d.area,
      age: d.age || '',
      gender: d.gender || '',
      vaccinated: !!d.vaccinated,
      condition: d.condition || 'New',
      contactName: d.name,
      contactPhone: d.phone,
      contactEmail: d.email || '',
      photos,
    };
  }

  /**
   * Uploads any photos, then creates the ad.
   *
   * Photos go up first so a rejected image cannot leave a half-published ad
   * behind — nothing needs cleaning up if that step fails.
   */
  async function publish() {
    const btn = $('#btnNext');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Publishing…';

    try {
      // Online this returns R2 keys; offline it returns the data URLs, which
      // are what the local fallback stores.
      const photos = photoFiles.length ? await API.uploadPhotos(photoFiles) : [];

      const result = await API.createAd(toApiPayload(draft, photos));
      $('#viewAdBtn').href = 'ad.html?id=' + encodeURIComponent(result.ad.id);
      return result;
    } catch (err) {
      // The server names the offending field; showing that beats a generic
      // failure the user cannot act on.
      const details = Object.values(err.details || {});
      UI.toast(details[0] || err.message || 'The ad could not be published.', 'err');
      return null;
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  /** The success panel says different things depending on what happened. */
  function showSuccess(result) {
    const heading = $('#s5');
    const body = $('#s5Body');

    if (result.offline) {
      heading.textContent = 'Your ad is saved in this browser';
      body.textContent = 'PetBikroy is not connected to its backend right now, so this ad '
        + 'lives only in this browser and nobody else can see it yet.';
    } else if (result.status === 'pending') {
      heading.textContent = 'Your ad is waiting for review';
      body.textContent = 'A moderator will check it shortly, and it will appear in search '
        + 'once approved. You can follow it in “My ads”.';
    } else {
      heading.textContent = 'Your ad is live!';
      body.textContent = 'It is already visible in search results and in “My ads”. Share the '
        + 'link with friends to get replies faster.';
    }
  }

  /* ----------------------------------------------------------- navigation */

  $('#btnNext').addEventListener('click', async () => {
    clearErrors();
    if (!validate(step)) {
      UI.toast('Please fix the highlighted fields', 'err');
      return;
    }
    if (step === 3) buildPreview();

    if (step === 4) {
      const result = await publish();
      if (!result) return;
      UI.updateFavBadge();
      showSuccess(result);
      showStep(5);
      UI.toast(
        result.offline ? 'Saved in this browser'
          : result.status === 'pending' ? 'Submitted for review'
          : 'Ad published — you are live!',
        'ok',
      );
      return;
    }
    showStep(step + 1);
  });

  $('#btnBack').addEventListener('click', () => {
    clearErrors();
    if (step > 1) showStep(step - 1);
  });

  $('#postAnother').addEventListener('click', () => {
    location.href = 'post.html';
  });

  // Live-clear the error styling once the user starts fixing a field.
  document.addEventListener('input', e => {
    const group = e.target.closest('.field, .mt-16');
    group?.classList.remove('field-error');
  }, true);

  /* ---------------------------------------------------------------- init */

  renderSteps();
  syncPriceField();
  renderPhotos();
})();
