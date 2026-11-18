import type { Metadata } from 'next';
import Feed from '@/components/Feed';
export const metadata: Metadata = { title: 'Game feed', description: 'Swipe through endless mini-games. Tap play and go.', alternates: { canonical: '/feed' } };
export default function FeedPage() { return <Feed />; }
