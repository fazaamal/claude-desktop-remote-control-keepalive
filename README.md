# Claude Desktop — Remote Control keepalive

A tiny console script that keeps your **Claude Code** chats reachable from your phone
(via Remote Control) by automatically reconnecting bridges that silently drop after a
chat goes idle.

> Unofficial. Uses the desktop app's own internal renderer APIs via its built-in
> developer console. No app files are modified. It may break on future updates.

## The problem

A Claude Code chat is reachable from claude.ai / your phone only while its session is
**registered with the Remote Control relay**. After a stretch of inactivity that
registration silently drops — the machine being awake doesn't matter — and the chat
disappears from Remote Control until you go to the machine and re-activate it (typing
`/remote-control` in that chat). Re-typing it by hand for every chat, every time, is the
pain this removes.

## How it works

Claude Desktop ships a sanctioned developer mode. With it enabled you get the in-app
DevTools console, whose page context exposes the app's own session API:

- `window["claude.web"].LocalSessions.warmSession(id)`
- `window["claude.web"].LocalSessions.toggleRemoteControl(id, true)`
- `window["claude.settings"].AppPreferences.getPreferences()` (groups + pins)

A bare `toggleRemoteControl(id, true)` on an idle session is refused
(`"Remote Control requires an active session"`). Calling `warmSession(id)` first makes
the toggle succeed — and it reconnects the bridge **without posting a message or spending
a turn** (the session stays idle; only its Remote Control registration is restored). This
is the programmatic equivalent of typing `/remote-control`, minus the message.

The script runs this on a timer for the chats you actually care about.

## Which chats it targets

Every **grouped or pinned** local Code chat on this machine — excluding archived, cloud,
and remote-started sessions. It re-reads your groups/pins from preferences on every tick,
so grouping or pinning a chat is picked up automatically; no hardcoded list.

- Groups come from `epitaxyPrefs["dframe-group-scopes"][*].assignments` (reliable).
- Pins come from `epitaxyPrefs["dframe-local-slice"].pinnedOrder`. **Heads up:** this list
  can be stale (it may keep chats that were unpinned). Set `INCLUDE_PINNED = false` at the
  top of the script for groups-only.

## Requirements

- macOS Claude Desktop (tested on a hardened build that refuses `--remote-debugging-port`;
  this approach doesn't need a debug port).
- The machine stays powered on with the app open (that's the point).

## Setup

1. **Enable developer tools** — in Terminal:

   ```bash
   echo '{"allowDevTools": true}' > ~/Library/Application\ Support/Claude/developer_settings.json
   ```

2. **Restart Claude Desktop** so the setting loads.

3. **Open the console** — press **Cmd-Option-I**. Two DevTools windows open; use the
   **main content** one and click the **Console** tab.

4. **Paste `keepalive.js`** into the console and press Enter. You'll see it arm and print
   a line per targeted chat, e.g. `[rc 23:41:02] Payment gateway options: ON`.

That's it. You can close the DevTools window — the timer keeps running in the page.

## Configuration

At the top of `keepalive.js`:

- `INTERVAL_MIN` — minutes between reconnect sweeps (default `4`).
- `INCLUDE_PINNED` — include pinned chats (default `true`; set `false` for groups only).

## Stopping

```js
clearInterval(window.__rcKeepAlive)
```

## Caveats

- **Dies on a full app restart** — re-paste it afterwards. (Idle-drops don't restart the
  app, so this still covers the actual bug.) There's no supported "run on launch" hook.
- **`pinnedOrder` can be stale** — see above; use `INCLUDE_PINNED = false` if it
  over-includes.
- Internal APIs are undocumented and may change between versions.

## License

MIT
