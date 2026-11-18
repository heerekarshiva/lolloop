'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { configured, createClient } from '@/lib/supabase/client'; // your existing browser client
import { applyAction, lobbyState, startGame, tick } from '@/lib/multiplayer/engine';
import { cleanName, type Identity } from '@/lib/multiplayer/identity';
import type { Action, MPGame, Player, RoomState } from '@/types/multiplayer';

export type RoomApi = ReturnType<typeof useRoom>;

/**
 * Host-authoritative room over Supabase Realtime (Broadcast + Presence).
 * No DB tables needed. Clients send actions; the host validates, ticks the
 * game clock and broadcasts snapshots (4/s max).
 */
export function useRoom(code: string, me: Identity) {
  const [hostGame] = useState<MPGame | null>(() => sessionStorage.getItem(`lolloop:host:${code}`) as MPGame | null);
  const isHost = !!hostGame;
  const [state, setState] = useState<RoomState | null>(() => (hostGame ? lobbyState(hostGame, Date.now()) : null));
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [hostGone, setHostGone] = useState(false);

  const stateRef = useRef<RoomState | null>(state);
  const playersRef = useRef<Player[]>([]);
  const offset = useRef(0);
  const dirty = useRef(false);
  const ch = useRef<RealtimeChannel | null>(null);

  const push = useCallback((s: RoomState) => {
    const snap = { ...s, hostNow: Date.now() };
    stateRef.current = snap;
    ch.current?.send({ type: 'broadcast', event: 'state', payload: snap });
  }, []);

  useEffect(() => {
    if (!configured) { setStatus('error'); return; }
    const supabase = createClient();
    const channel = supabase.channel(`lolloop:room:${code}`, {
      config: { broadcast: { self: true }, presence: { key: me.id } },
    });
    ch.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const seen = new Map<string, Player>();
        Object.values(channel.presenceState<Player>()).flat().forEach((p) => {
          if (p?.id) seen.set(p.id, { id: p.id, name: cleanName(p.name) || 'Player', isHost: !!p.isHost });
        });
        const list = [...seen.values()].sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.name.localeCompare(b.name));
        playersRef.current = list;
        setPlayers(list);
      })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        const s = payload as RoomState;
        offset.current = s.hostNow - Date.now();
        stateRef.current = s;
        setState(s);
      })
      .on('broadcast', { event: 'action' }, ({ payload }) => {
        if (!isHost || !stateRef.current) return;
        const known = playersRef.current.some((p) => p.id === payload?.id);
        if (!known) return;
        const next = applyAction(stateRef.current, payload.id, payload.action as Action, Date.now());
        if (next) { stateRef.current = next; dirty.current = true; }
      })
      .on('broadcast', { event: 'hello' }, () => {
        if (isHost && stateRef.current) push(stateRef.current);
      })
      .subscribe(async (st) => {
        if (st === 'SUBSCRIBED') {
          setStatus('live');
          await channel.track({ id: me.id, name: me.name, isHost });
          if (isHost && stateRef.current) push(stateRef.current);
          else channel.send({ type: 'broadcast', event: 'hello', payload: {} });
        } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('error');
      });

    const timer = isHost
      ? setInterval(() => {
          const s = stateRef.current;
          if (!s) return;
          const next = tick(s, playersRef.current.map((p) => p.id), Date.now());
          if (next) { stateRef.current = next; dirty.current = true; }
          if (dirty.current) { dirty.current = false; push(stateRef.current!); }
        }, 250)
      : undefined;

    return () => { if (timer) clearInterval(timer); supabase.removeChannel(channel); };
  }, [code, me.id, me.name, isHost, push]);

  // guests: flag if the host disappears for 5s
  useEffect(() => {
    if (isHost || !state || players.length === 0 || players.some((p) => p.isHost)) { setHostGone(false); return; }
    const t = setTimeout(() => setHostGone(true), 5000);
    return () => clearTimeout(t);
  }, [isHost, state, players]);

  const send = useCallback((action: Action) => {
    ch.current?.send({ type: 'broadcast', event: 'action', payload: { id: me.id, action } });
  }, [me.id]);

  const start = useCallback(() => {
    if (!isHost || !stateRef.current) return;
    push(startGame(stateRef.current, playersRef.current.map((p) => p.id), Date.now()));
  }, [isHost, push]);

  const backToLobby = useCallback(() => {
    if (!isHost || !stateRef.current) return;
    push(lobbyState(stateRef.current.game, Date.now()));
  }, [isHost, push]);

  const now = useCallback(() => Date.now() + offset.current, []);

  return { me, isHost, state, players, status, hostGone, send, start, backToLobby, now };
}
