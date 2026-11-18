'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAction, lobbyState, startGame, tick } from '@/lib/multiplayer/engine';
import type { Identity } from '@/lib/multiplayer/identity';
import type { Action, MPGame, RoomState } from '@/types/multiplayer';
import type { RoomApi } from './useRoom';

/** Single-player: runs the same engine locally, no network. */
export function useLocalRoom(game: MPGame, me: Identity): RoomApi {
  const init = () => startGame(lobbyState(game, Date.now()), [me.id], Date.now());
  const [state, setState] = useState<RoomState>(init);
  const ref = useRef(state);
  useEffect(() => {
    const t = setInterval(() => { const n = tick(ref.current, [me.id], Date.now()); if (n) { ref.current = n; setState(n); } }, 100);
    return () => clearInterval(t);
  }, [me.id]);
  const send = useCallback((a: Action) => { const n = applyAction(ref.current, me.id, a, Date.now()); if (n) { ref.current = n; setState(n); } }, [me.id]);
  return { me, isHost: true, state, players: [{ id: me.id, name: me.name || 'You', isHost: true }], status: 'live', hostGone: false, send, start() {}, backToLobby() {}, now: () => Date.now() };
}
