/* Claude Desktop — Remote Control keepalive (paste into DevTools Console, Cmd-Opt-I).
   Auto-targets every GROUPED or PINNED local desktop Code chat (non-archived, not cloud,
   not remote-started) and re-asserts Remote Control via warmSession + toggleRemoteControl.
   No message posted, no turn spent. Re-reads groups/pins each tick. Survives closing
   DevTools; dies on app restart (re-paste). Stop early: clearInterval(window.__rcKeepAlive)
   NOTE: pinnedOrder can be stale (may list unpinned chats). Set INCLUDE_PINNED=false for groups only. */
(() => {
  const W = window["claude.web"], S = window["claude.settings"];
  const LS = W.LocalSessions, AP = S.AppPreferences;
  const INTERVAL_MIN = 4;
  const INCLUDE_PINNED = true;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function resolveEp(prefs) {
    if (!prefs || typeof prefs !== 'object') return {};
    if (prefs["dframe-group-scopes"]) return prefs;
    if (prefs.epitaxyPrefs && prefs.epitaxyPrefs["dframe-group-scopes"]) return prefs.epitaxyPrefs;
    for (const v of Object.values(prefs)) if (v && typeof v === 'object' && v["dframe-group-scopes"]) return v;
    return prefs.epitaxyPrefs || prefs;
  }
  async function targets() {
    const ep = resolveEp(await AP.getPreferences());
    const ids = new Set();
    for (const sc of Object.values(ep["dframe-group-scopes"] || {}))
      for (const k of Object.keys(sc.assignments || {})) ids.add(k.replace(/^code:/, ''));
    if (INCLUDE_PINNED)
      for (const k of ((ep["dframe-local-slice"] || {}).pinnedOrder || [])) ids.add(k.replace(/^code:/, ''));
    const all = await LS.getAll();
    return all.filter(s => !s.isArchived && !s.isCloudRun && !s.startedViaRemoteControl && ids.has(s.sessionId));
  }

  const tick = async () => {
    const t = new Date().toLocaleTimeString();
    let list;
    try { list = await targets(); }
    catch (e) { console.warn(`[rc ${t}] target ERR ${e && e.message || e}`); return; }
    if (!list.length) { console.log(`[rc ${t}] no grouped/pinned chats`); return; }
    for (const s of list) {
      try {
        await LS.warmSession(s.sessionId);
        await sleep(2500);
        const r = await LS.toggleRemoteControl(s.sessionId, true);
        console.log(`[rc ${t}] ${s.title}: ${r && r.ok ? 'ON' : JSON.stringify(r)}`);
      } catch (e) { console.warn(`[rc ${t}] ${s.title}: ERR ${e && e.message || e}`); }
    }
  };

  if (window.__rcKeepAlive) clearInterval(window.__rcKeepAlive);
  window.__rcKeepAlive = setInterval(tick, INTERVAL_MIN * 60000);
  tick();
  return `rc-keepalive armed (grouped + pinned), every ${INTERVAL_MIN} min. Stop: clearInterval(window.__rcKeepAlive)`;
})()
