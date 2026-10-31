/* ==========================================================================
   PetBikroy — buyer ⇄ seller messaging

   A conversation links a buyer and a seller about a single ad (or, with no ad,
   about nothing in particular). Messages carry a `status` that flips from
   `sent` to `read` when the recipient opens the conversation, which is how the
   unread badge is computed without a per-user read-receipt table.

   Only the two participants may read or send. Ownership of a conversation is
   therefore a simple id check, never a token.
   ========================================================================== */

import { newId, nowIso, HttpError, str } from './http.js';

const MAX_MESSAGE_BYTES = 4_000;

/**
 * Loads a conversation and confirms the caller is one of its two participants.
 * @returns {object|null} the conversation row, or null when missing / not a party
 */
async function loadConversation(env, convId, userId) {
  const conv = await env.DB.prepare(
    'SELECT * FROM conversations WHERE id = ?',
  ).bind(convId).first();
  if (!conv) return null;
  if (conv.seller_id !== userId && conv.buyer_id !== userId) return null;
  return conv;
}

/** The member who owns an ad — the seller in a buyer-initiated thread. */
async function adOwner(env, adId) {
  const row = await env.DB.prepare('SELECT user_id FROM ads WHERE id = ?').bind(adId).first();
  return row ? row.user_id : null;
}

/** The display name of the member who is not `userId` in this conversation. */
async function otherName(env, conv, userId) {
  const who = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;
  const row = await env.DB.prepare(
    'SELECT id, name FROM users WHERE id = ?',
  ).bind(who).first();
  return row ? row.name : 'Member';
}

/**
 * The conversation's most recent message, for the list view.
 * @returns {{body: string, createdAt: string, senderId: string}|null}
 */
async function lastMessage(env, convId) {
  const row = await env.DB.prepare(
    'SELECT body, created_at, sender_id FROM messages '
    + 'WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
  ).bind(convId).first();
  if (!row) return null;
  return { body: row.body, createdAt: row.created_at, senderId: row.sender_id };
}

/** Unread messages from the *other* party in one conversation. */
async function unreadFor(env, conv, userId) {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM messages '
    + `WHERE conversation_id = ? AND sender_id <> ? AND status = 'sent'`,
  ).bind(conv.id, userId).first();
  return row?.n ?? 0;
}

/**
 * Every conversation the member is part of, newest message first, with the
 * unread count and a preview of the latest message.
 */
export async function listConversations(env, userId) {
  const rows = await env.DB.prepare(
    'SELECT * FROM conversations '
    + 'WHERE buyer_id = ? OR seller_id = ? ORDER BY last_message_at DESC, created_at DESC',
  ).bind(userId, userId).all();

  const conversations = (rows.results ?? []);
  const out = [];
  for (const conv of conversations) {
    const [last, unread] = await Promise.all([
      lastMessage(env, conv.id),
      unreadFor(env, conv, userId),
    ]);
    out.push({
      id: conv.id,
      adId: conv.ad_id || null,
      sellerId: conv.seller_id,
      buyerId: conv.buyer_id,
      otherName: await otherName(env, conv, userId),
      lastMessage,
      lastMessageAt: conv.last_message_at,
      unread,
    });
  }
  return out;
}

/**
 * A single conversation with its messages, for the chat pane.
 * @returns {{conversation: object, messages: object[], otherName: string}|null}
 */
export async function getConversation(env, convId, userId) {
  const conv = await loadConversation(env, convId, userId);
  if (!conv) return null;

  const [messages, otherNameText] = await Promise.all([
    env.DB.prepare(
      'SELECT body, created_at, sender_id, status FROM messages '
      + 'WHERE conversation_id = ? ORDER BY created_at ASC, id ASC',
    ).bind(convId).all(),
    otherName(env, conv, userId),
  ]);

  return {
    conversation: conv,
    otherName: otherNameText,
    messages: (messages.results ?? []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      status: m.status,
      createdAt: m.created_at,
    })),
  };
}

/**
 * Starts (or resumes) a conversation between the caller and a seller, and
 * drops the first message into it.
 *
 * The caller is the buyer; the ad owner is the seller. When the caller *is* the
 * ad owner, they must supply the buyer id, and the roles are flipped so the
 * seller's own conversation still points at the right seller.
 *
 * @returns {{conversation: object, message: object}}
 */
export async function startConversation(env, { callerId, adId, sellerId, buyerId, body }) {
  const now = nowIso();
  const text = str(body, MAX_MESSAGE_BYTES);

  // The caller is always the buyer; the seller is the ad owner (or the
  // explicitly supplied sellerId). Roles are fixed this way so a thread always
  // has a stable seller and buyer even after either party signs out.
  const partySeller = sellerId || (adId ? await adOwner(env, adId) : null);
  const partyBuyer = callerId;

  if (!partySeller) {
    throw new HttpError('An ad or a seller is required to start a message.', 400);
  }
  if (adId && !partySeller) {
    throw new HttpError('That ad does not exist.', 404);
  }
  // Nobody messages themselves.
  if (partySeller === partyBuyer) {
    throw new HttpError('You cannot start a conversation with yourself.', 400);
  }

  // Find an existing conversation between these two about this ad, so a second
  // "message" on the same ad resumes the thread instead of duplicating it.
  const existing = await env.DB.prepare(
    "SELECT id FROM conversations "
    + "WHERE seller_id = ? AND buyer_id = ? AND (ad_id = ? OR (ad_id IS NULL AND ? IS NULL))",
  ).bind(partySeller, partyBuyer, adId || null, adId || null).first();

  let convId = existing?.id;
  if (!convId) {
    convId = newId('conv-');
    await env.DB.prepare(
      'INSERT INTO conversations (id, ad_id, seller_id, buyer_id, created_at, last_message_at) '
      + 'VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(convId, adId || null, partySeller, partyBuyer, now, now).run();
  }

  const messageId = newId('msg-');
  await env.DB.prepare(
    'INSERT INTO messages (id, conversation_id, sender_id, body, status, created_at) '
    + 'VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(messageId, convId, callerId, text, 'sent', now).run();

  await env.DB.prepare(
    'UPDATE conversations SET last_message_at = ? WHERE id = ?',
  ).bind(now, convId).run();

  const [message, conv] = await Promise.all([
    env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first(),
    loadConversation(env, convId, callerId),
  ]);

  return {
    conversation: conv,
    message: {
      id: message.id,
      senderId: message.sender_id,
      body: message.body,
      status: message.status,
      createdAt: message.created_at,
    },
  };
}

/** Appends a message to an existing conversation the caller can see. */
export async function sendMessage(env, { convId, senderId, body }) {
  const conv = await loadConversation(env, convId, senderId);
  if (!conv) throw new HttpError('That conversation could not be found.', 404);

  const text = str(body, MAX_MESSAGE_BYTES);
  if (!text.trim()) throw new HttpError('The message cannot be empty.', 400);

  const now = nowIso();
  const messageId = newId('msg-');
  await env.DB.prepare(
    'INSERT INTO messages (id, conversation_id, sender_id, body, status, created_at) '
    + 'VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(messageId, convId, senderId, text, 'sent', now).run();

  await env.DB.prepare(
    'UPDATE conversations SET last_message_at = ? WHERE id = ?',
  ).bind(now, convId).run();

  return {
    id: messageId,
    senderId,
    body: text,
    status: 'sent',
    createdAt: now,
  };
}

/**
 * Marks every message from the other party in a conversation as read.
 * @returns {number} the unread count left (zero, unless the other party just wrote)
 */
export async function markRead(env, convId, userId) {
  await env.DB.prepare(
    "UPDATE messages SET status = 'read' "
    + "WHERE conversation_id = ? AND sender_id <> ? AND status = 'sent'",
  ).bind(convId, userId).run();
  return unreadFor(env, await loadConversation(env, convId, userId), userId);
}

/** Total unread messages across all of a member's conversations. */
export async function unreadTotal(env, userId) {
  const rows = await env.DB.prepare(
    "SELECT sender_id FROM messages WHERE status = 'sent'",
  ).all();
  let total = 0;
  for (const m of rows.results ?? []) {
    if (m.sender_id !== userId) total += 1;
  }
  return total;
}
