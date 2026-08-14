import { NextResponse, after } from 'next/server';
import { processMcQueue } from '@/app/lib/actions';

// Background worker for the master-class analysis queue. Returns immediately;
// the actual analyse→send work runs after the response via `after()`.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST() {
  after(async () => {
    try { await processMcQueue(); } catch (e) { console.error('mc/process failed:', e); }
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  after(async () => {
    try { await processMcQueue(); } catch (e) { console.error('mc/process failed:', e); }
  });
  return NextResponse.json({ ok: true });
}
