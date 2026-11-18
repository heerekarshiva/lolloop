'use client';
import { useParams } from 'next/navigation';
import RoomView from '@/components/multiplayer/RoomView';
import { Shell, btnDark } from '@/components/multiplayer/ui';
import { isValidCode } from '@/lib/multiplayer/identity';
import Link from 'next/link';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? '').toUpperCase();
  if (!isValidCode(code)) {
    return <Shell><h1 className="text-2xl font-extrabold">That room code isn't valid</h1><Link href="/multiplayer" className={`${btnDark} mt-4 inline-block`}>Back</Link></Shell>;
  }
  return <RoomView code={code} />;
}
