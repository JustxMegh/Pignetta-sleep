# Sleep Role Bot

A Discord bot where reacting ✅ on a designated message gives a user the
**asleep** role, and reacting ❌ gives them the **awake** role. The two
roles are mutually exclusive — getting one always removes the other — and
every time a role is removed, the bot logs how long the user held it.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a bot** at https://discord.com/developers/applications
   - Add it to your server with the `applications.commands` and standard
     bot scopes, and these permissions: `Manage Roles`, `Read Messages`,
     `Send Messages`, `Read Message History`, `Add Reactions`.
   - In the Bot tab, enable the **Server Members Intent**.
   - Make sure the bot's role is positioned **above** both the "asleep"
     and "awake" roles in your server's role list, or it won't be able to
     assign/remove them.

3. **Create the roles** "asleep" and "awake" in your server, and copy
   their role IDs (enable Developer Mode in Discord settings, then
   right-click a role in Server Settings → Roles).

4. **Pick a channel** for the reaction-role message to live in, and copy
   its channel ID. You don't need to post the message yourself — the bot
   does that automatically on startup (see "How it works" below).

5. **Copy `.env.example` to `.env`** and fill in:
   - `DISCORD_TOKEN` — your bot's token
   - `CLIENT_ID` — your bot's Application ID (General Information tab,
     same page as the token)
   - `GUILD_ID` — your server's ID
   - `REACTION_ROLE_CHANNEL_ID` — the channel from step 4
   - `REACTION_ROLE_MESSAGE_TEXT` — optional, customize the message text
   - `ASLEEP_ROLE_ID` / `AWAKE_ROLE_ID` — from step 3
   - `LOG_CHANNEL_ID` — the channel where duration logs get posted
   - `TICK_EMOJI` / `X_EMOJI` — leave as ✅ / ❌, or change to a custom
     emoji in `name:id` format

6. **Run it**
   ```bash
   npm start
   ```
   On startup, check the console for a line like
   `Reaction-role message ready: https://discord.com/channels/...` —
   that link takes you straight to the message the bot just posted.

## How it works

- On startup, the bot posts its own reaction-role message in
  `REACTION_ROLE_CHANNEL_ID` and reacts to it with ✅ and ❌ automatically
  — you don't need to post or react to anything by hand.
- The bot remembers that message's ID in `message-id.json` next to
  `index.js`, so restarting the bot reuses the same message instead of
  posting a new one each time. (If you delete the message on Discord, the
  bot will notice on next restart and post a fresh one.)
- Anyone with **Manage Roles** permission can also run **`/post-sleep-message`**
  at any time to force a brand-new copy of the message to be posted (e.g.
  if you want it lower down in the channel, or the old one got buried).
  This always creates a new message rather than reusing the old one.
- Reacting ✅ → user gets "asleep" (their "awake" role is removed first,
  and that duration is logged).
- Reacting ❌ → user gets "awake" (their "asleep" role is removed first,
  and that duration is logged).
- Removing your own reaction also removes the matching role and logs the
  duration.
- A user can never hold both roles — the bot always strips the other one
  before granting the new one.
- Role state (who has what, since when) is stored in `state.json` next to
  `index.js`, so durations are tracked correctly even across bot
  restarts.

## Note on permissions

Since the bot now posts the message itself, make sure its role has
**Send Messages** and **Add Reactions** permissions in whichever channel
you set as `REACTION_ROLE_CHANNEL_ID`. Also make sure your bot's invite
link included the `applications.commands` scope (in addition to `bot`),
or the slash command won't show up in Discord — you can regenerate the
invite link under the **OAuth2 → URL Generator** tab if needed.
