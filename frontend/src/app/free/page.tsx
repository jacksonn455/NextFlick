// frontend/app/free/page.tsx
import { redirect } from 'next/navigation';

// The free catalog moved to /watch; old links (and their search) keep working
export default async function FreePage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] : q;
  redirect(query ? `/watch?q=${encodeURIComponent(query)}` : '/watch');
}
