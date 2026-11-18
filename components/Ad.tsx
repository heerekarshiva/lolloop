'use client';
import { useEffect, useRef } from 'react';
const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
/** Renders nothing unless NEXT_PUBLIC_ADSENSE_CLIENT_ID and a slot id are configured. Never place over game controls. */
export default function Ad({ slot }: { slot?: string }) {
  const done = useRef(false);
  useEffect(() => { if (client && slot && !done.current) { done.current = true; try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch { /* blocked */ } } }, [slot]);
  if (!client || !slot) return null;
  return <aside aria-label="Advertisement" className="my-6 min-h-[100px] overflow-hidden rounded-3xl bg-field p-2 text-center"><p className="text-[10px] font-semibold opacity-50">Advertisement</p><ins className="adsbygoogle block" data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}
