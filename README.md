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

4. **Post a message** in whichever channel you want to use for reaction
   roles, e.g.:
   ```
   React ✅ to mark yourself asleep, ❌ to mark yourself awake.
   ```
   React to it yourself once with ✅ and once with ❌ so the emojis are
   attached to the message (the bot only listens for reactions already
   present, it doesn't need to add them itself, though you can have it
   auto-react on startup if you prefer — see note below).

5. **Copy `.env.example` to `.env`** and fill in:
   - `DISCORD_TOKEN` — your bot's token
   - `GUILD_ID` — your server's ID
   - `REACTION_ROLE_CHANNEL_ID` / `REACTION_ROLE_MESSAGE_ID` — the channel
     and message from step 4
   - `ASLEEP_ROLE_ID` / `AWAKE_ROLE_ID` — from step 3
   - `LOG_CHANNEL_ID` — the channel where duration logs get posted
   - `TICK_EMOJI` / `X_EMOJI` — leave as ✅ / ❌, or change to a custom
     emoji in `name:id` format

6. **Run it**
   ```bash
   npm start
   ```

## How it works

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

## Optional: auto-react on startup

If you want the bot to add the ✅/❌ reactions to the message itself on
boot (rather than you doing it manually), add this inside the `ready`
event in `index.js`:

```js
const channel = await client.channels.fetch(process.env.REACTION_ROLE_CHANNEL_ID);
const message = await channel.messages.fetch(process.env.REACTION_ROLE_MESSAGE_ID);
await message.react(process.env.TICK_EMOJI);
await message.react(process.env.X_EMOJI);
```
