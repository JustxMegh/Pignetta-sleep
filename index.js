/**
 * Sleep Role Bot
 * -----------------------------------------------------------------------
 * On startup, the bot posts its own reaction-role message in
 * REACTION_ROLE_CHANNEL_ID (or reuses one it already posted — see
 * message-id.json below) and reacts to it with TICK_EMOJI and X_EMOJI.
 *
 * Reacting with TICK_EMOJI on that message gives the user the "asleep"
 * role (removing "awake" first if they had it).
 *
 * Reacting with X_EMOJI gives them the "awake" role (removing "asleep"
 * first if they had it).
 *
 * Every time one of these roles is removed from a user, the bot works out
 * how long they had held it and posts a line to LOG_CHANNEL_ID, e.g.:
 *   "Alice was asleep for 3h 12m"
 *
 * A user can never hold both roles at once — whichever role they had is
 * always stripped before the new one is added.
 *
 * State (who has which role, and since when) is kept in state.json so
 * that duration tracking survives bot restarts. The ID of the bot's own
 * reaction-role message is kept in message-id.json for the same reason
 * (so it doesn't repost a new message every time it restarts).
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
} = require('discord.js');

const {
  DISCORD_TOKEN,
  GUILD_ID,
  REACTION_ROLE_CHANNEL_ID,
  REACTION_ROLE_MESSAGE_TEXT,
  ASLEEP_ROLE_ID,
  AWAKE_ROLE_ID,
  LOG_CHANNEL_ID,
  TICK_EMOJI,
  X_EMOJI,
} = process.env;

const REQUIRED_VARS = {
  DISCORD_TOKEN,
  GUILD_ID,
  REACTION_ROLE_CHANNEL_ID,
  ASLEEP_ROLE_ID,
  AWAKE_ROLE_ID,
  LOG_CHANNEL_ID,
  TICK_EMOJI,
  X_EMOJI,
};

for (const [name, value] of Object.entries(REQUIRED_VARS)) {
  if (!value) {
    console.error(`Missing required .env value: ${name}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------
// Tiny JSON-backed store: { [userId]: { role: 'asleep' | 'awake', since: number } }
// ---------------------------------------------------------------------
const STATE_PATH = path.join(__dirname, 'state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

let state = loadState();

// ---------------------------------------------------------------------
// Remembers the ID of the reaction-role message the bot posts itself,
// so restarting the bot doesn't post a duplicate message each time.
// ---------------------------------------------------------------------
const MESSAGE_ID_PATH = path.join(__dirname, 'message-id.json');

function loadReactionRoleMessageId() {
  try {
    return JSON.parse(fs.readFileSync(MESSAGE_ID_PATH, 'utf8')).messageId;
  } catch {
    return null;
  }
}

function saveReactionRoleMessageId(messageId) {
  fs.writeFileSync(MESSAGE_ID_PATH, JSON.stringify({ messageId }, null, 2));
}

/**
 * Fetches the bot's existing reaction-role message if we've posted one
 * before (and it still exists), otherwise posts a new one and reacts to
 * it with both tracked emojis.
 */
async function getOrCreateReactionRoleMessage(client) {
  const channel = await client.channels.fetch(REACTION_ROLE_CHANNEL_ID);

  const existingId = loadReactionRoleMessageId();
  if (existingId) {
    const existing = await channel.messages.fetch(existingId).catch(() => null);
    if (existing) return existing;
    // Message was deleted out from under us — fall through and repost.
  }

  const text =
    REACTION_ROLE_MESSAGE_TEXT ||
    `React ${TICK_EMOJI} to mark yourself asleep, ${X_EMOJI} to mark yourself awake.`;

  const message = await channel.send(text);
  await message.react(TICK_EMOJI);
  await message.react(X_EMOJI);

  saveReactionRoleMessageId(message.id);
  return message;
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/** Format a millisecond duration as "1d 2h 3m 4s" (skipping zero units). */
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

/** Matches a raw reaction event to one of our two tracked emojis. */
function matchEmoji(reaction) {
  const identifier = reaction.emoji.id
    ? `${reaction.emoji.name}:${reaction.emoji.id}`
    : reaction.emoji.name;

  if (identifier === TICK_EMOJI || reaction.emoji.name === TICK_EMOJI) {
    return 'asleep';
  }
  if (identifier === X_EMOJI || reaction.emoji.name === X_EMOJI) {
    return 'awake';
  }
  return null;
}

async function getLogChannel(client) {
  return client.channels.fetch(LOG_CHANNEL_ID);
}

/**
 * Remove whichever tracked role the member currently has (per our state),
 * log how long they had it, and clear that state entry.
 * Returns the role name that was removed, or null if they had none.
 */
async function clearExistingRole(client, member) {
  const entry = state[member.id];
  if (!entry) return null;

  const roleId = entry.role === 'asleep' ? ASLEEP_ROLE_ID : AWAKE_ROLE_ID;
  const heldMs = Date.now() - entry.since;

  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId).catch((err) =>
      console.error(`Failed to remove ${entry.role} role from ${member.id}:`, err)
    );
  }

  delete state[member.id];
  saveState(state);

  const logChannel = await getLogChannel(client);
  if (logChannel?.isTextBased()) {
    await logChannel.send(
      `**${member.user.tag}** was **${entry.role}** for **${formatDuration(heldMs)}**`
    );
  }

  return entry.role;
}

/** Give the member a tracked role, recording the start time. */
async function grantRole(member, roleName) {
  const roleId = roleName === 'asleep' ? ASLEEP_ROLE_ID : AWAKE_ROLE_ID;

  if (!member.roles.cache.has(roleId)) {
    await member.roles.add(roleId).catch((err) =>
      console.error(`Failed to add ${roleName} role to ${member.id}:`, err)
    );
  }

  state[member.id] = { role: roleName, since: Date.now() };
  saveState(state);
}

// ---------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

let reactionRoleMessageId = null;

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const message = await getOrCreateReactionRoleMessage(client);
    reactionRoleMessageId = message.id;
    console.log(`Reaction-role message ready: ${message.url}`);
  } catch (err) {
    console.error('Failed to post/fetch reaction-role message:', err);
  }
});

async function handleReaction(reaction, user, added) {
  if (user.bot) return;
  if (!reactionRoleMessageId || reaction.message.id !== reactionRoleMessageId) return;

  // Fetch partials fully if needed.
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (err) {
      console.error('Failed to fetch partial reaction:', err);
      return;
    }
  }

  const targetRole = matchEmoji(reaction);
  if (!targetRole) return; // Not one of our two tracked emojis, ignore.

  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  if (added) {
    // If they already have the OTHER role, remove it first (and log it).
    // If they already have THIS role, clearing+regranting just resets
    // their "since" timer, which we skip to avoid resetting on double-clicks.
    const existing = state[member.id];
    if (existing && existing.role === targetRole) {
      return; // already in this state, nothing to do
    }

    await clearExistingRole(client, member);
    await grantRole(member, targetRole);
  } else {
    // Reaction removed: only clear the role if it matches what removing
    // this reaction implies, so unrelated reaction removals don't wipe state.
    const existing = state[member.id];
    if (existing && existing.role === targetRole) {
      await clearExistingRole(client, member);
    }
  }
}

client.on('messageReactionAdd', (reaction, user) => {
  handleReaction(reaction, user, true).catch(console.error);
});

client.on('messageReactionRemove', (reaction, user) => {
  handleReaction(reaction, user, false).catch(console.error);
});

client.login(DISCORD_TOKEN);
