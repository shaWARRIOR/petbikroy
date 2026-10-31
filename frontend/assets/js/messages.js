/* ==========================================================================
   PetBikroy — Messages

   Buyer ⇄ seller chat, driven by the /api/messages endpoints. Loads your
   conversations, opens one into the chat pane, sends messages and marks the
   thread read. Because a message thread needs an account, the page shows a
   sign-in prompt when there is no signed-in member (or no live backend).

   ?conv=<id> opens a specific thread — used by the "Message seller" button on
   an ad page.
   ========================================================================== */

(() => {
  'use strict';

  const { $, $$, esc, icon } = UI;

  UI.mountChrome();
  $('#crumbs').innerHTML = UI.crumbs([
    { label: 'Home', href: 'index.html' },
    { label: 'Messages' },
  ]);

  let conversations = [];
  let current = null;   // the conversation currently open

  const convId = UI.qs().get('conv');

  /* ---------------------------------------------------------- accounts */

  /** Signed-out or no backend: show the sign-in gate. */
  function showGate() {
    $('#chat').innerHTML = `<div class="chat-empty" style="max-width:480px;margin:40px auto">
      <div>
        <div class="big">🔐</div>
        <h3 style="margin:8px 0">Sign in to view your messages</h3>
        <p class="muted small" style="margin-bottom:16px">
          Messages connect buyers and sellers about a specific ad. Sign in with
          your PetBikroy account to start chatting.
        </p>
        <div class="row gap-8" style="justify-content:center">
          <a class="btn btn-primary" href="login.html?next=messages.html">Sign in</a>
          <a class="btn btn-outline" href="register.html?next=messages.html">Create an account</a>
        </div>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------- threads */

  function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < (name || '').length; i += 1) h = name.charCodeAt(i) + ((h << 3) + h);
    return `hsl(${h % 360}, 45%, 60%)`;
  }

  function renderThreads() {
    $('#threadCount').textContent = conversations.length
      ? `${conversations.length} conversations`
      : '0';

    const host = $('#threadHost');
    if (!conversations.length) {
      host.innerHTML = `<div class="chat-empty" style="padding:30px 16px">
        <p class="small muted">You have no conversations yet.</p>
        <p class="tiny muted">When a seller replies to one of your ads — or you
          message one — it will show up here.</p>
      </div>`;
      return;
    }

    host.innerHTML = conversations.map(t => {
      const initial = (t.otherName || '?').trim().charAt(0).toUpperCase();
      const preview = t.lastMessage
        ? (t.lastMessage.senderId === current?.id ? `You: ${t.lastMessage.body}` : t.lastMessage.body)
        : 'No messages yet';
      return `<div class="chat-thread ${t.id === current?.id ? 'is-active' : ''}"
                 data-thread="${esc(t.id)}">
        <span class="avatar" style="background:${esc(avatarColor(t.otherName))}">${esc(initial)}</span>
        <div class="body">
          <div class="top-row">
            <span class="who">${esc(t.otherName)}</span>
            <span class="when">${t.lastMessageAt ? esc(PB.timeAgo(t.lastMessageAt)) : ''}</span>
          </div>
          <div class="preview">${esc(preview.slice(0, 80))}</div>
        </div>
        ${t.unread ? `<span class="dot"><span class="badge">${t.unread}</span></span>` : ''}
      </div>`;
    }).join('');

    document.querySelectorAll('[data-thread]').forEach((el) => {
      el.addEventListener('click', () => openThread(el.dataset.thread));
    });
  }

  /* ----------------------------------------------------------- chat pane */

  async function openThread(id) {
    current = { id };
    const data = await API.messageMessages(id);
    if (!data) { UI.toast('That conversation could not be opened.', 'err'); return; }

    // Mark the thread read so the badge clears.
    API.messageRead(id);

    const initial = (data.otherName || '?').trim().charAt(0).toUpperCase();
    $('#winAvatar').textContent = initial;
    $('#winAvatar').style.background = avatarColor(data.otherName);
    $('#winWho').textContent = data.otherName;

    const adLink = $('#winAd');
    const conv = data.conversation;
    if (conv.ad_id) {
      adLink.href = `ad.html?id=${encodeURIComponent(conv.ad_id)}`;
      adLink.textContent = 'View the ad →';
      adLink.style.display = '';
    } else {
      adLink.style.display = 'none';
    }

    // Mobile: show the window, hide the list.
    $('#chatList').classList.add('is-hidden');
    $('#chatWindow').classList.remove('is-hidden');
    $('#chatEmpty').classList.add('is-hidden');
    $('#chatActive').classList.remove('is-hidden');

    renderMessages(data.messages);

    // Scroll to the newest message.
    requestAnimationFrame(() => {
      const box = $('#msgBox');
      box.scrollTop = box.scrollHeight;
    });

    renderThreads();
  }

  function renderMessages(messages) {
    const box = $('#msgBox');
    const mine = API.user?.id;
    if (!messages.length) {
      box.innerHTML = `<div class="chat-empty" style="margin:auto">
        <p class="small muted">Say hello 👋</p></div>`;
      return;
    }
    box.innerHTML = messages.map(m => {
      const cls = m.senderId === mine ? 'mine' : 'theirs';
      return `<div class="bubble ${cls}">
        ${esc(m.body)}
        <div class="meta">${esc(PB.timeAgo(m.createdAt))}</div>
      </div>`;
    }).join('');
  }

  /* -------------------------------------------------------------- send */

  $('#composer').addEventListener('submit', async e => {
    e.preventDefault();
    if (!current) return;
    const input = $('#msgInput');
    const body = input.value.trim();
    if (!body) return;

    input.value = '';
    input.style.height = '44px';
    const btn = $('#sendBtn');
    btn.disabled = true;

    try {
      const { message } = await API.messageSend(current.id, body);
      // Optimistically append, then re-fetch to stay in sync.
      const box = $('#msgBox');
      box.insertAdjacentHTML('beforeend',
        `<div class="bubble mine">${esc(message.body)}
          <div class="meta">${esc(PB.timeAgo(message.createdAt))}</div></div>`);
      box.scrollTop = box.scrollHeight;
      await refresh();
    } catch (err) {
      UI.toast(err.message || 'The message could not be sent.', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  // Grow the textarea as the message grows.
  $('#msgInput').addEventListener('input', (e) => {
    const el = e.target;
    el.height = Math.min(120, el.scrollHeight);
  });

  // Back button on mobile.
  $('#chatBack')?.addEventListener('click', () => {
    $('#chatWindow').classList.add('is-hidden');
    $('#chatList').classList.remove('is-hidden');
  });

  /* ------------------------------------------------------------- refresh */

  async function refresh() {
    conversations = await API.messageConversations();
    $('#threadCount').textContent = conversations.length
      ? `${conversations.length} conversations`
      : '0';
    renderThreads();
    if (current) {
      const data = await API.messageMessages(current.id);
      if (data) renderMessages(data.messages);
    }
    UI.updateMessageBadge();
  }

  /* ----------------------------------------------------------------- boot */

  async function boot() {
    await API.ready;

    if (!API.available || !API.user) {
      showGate();
      return;
    }

    await refresh();

    // Open a thread requested from an ad page.
    if (convId && conversations.length) {
      const target = conversations.find(t => t.id === convId);
      if (target) await openThread(convId);
    }
  }

  boot();

  // Keep the header badge honest while the page is open.
  setInterval(() => { if (API.available && API.user) UI.updateMessageBadge(); }, 30000);
})();
