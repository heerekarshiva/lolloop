import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Play with friends | LOLLOOP',
  description: 'Create a room, share the link and play LOLLOOP games with friends in real time. No account needed.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
