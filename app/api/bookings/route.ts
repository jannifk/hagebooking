import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { promises as fs } from 'fs';
import path from 'path';

// In local dev (no KV env vars), fall back to a JSON file on disk.
const IS_LOCAL = !process.env.KV_REST_API_URL;
const LOCAL_FILE = path.join(process.cwd(), '.local-bookings.json');

interface Booking {
  id: string;
  zone: 'forhage' | 'bakhage' | 'hele';
  date: string;   // YYYY-MM-DD
  name: string;
  desc: string;
}

async function readAll(): Promise<Booking[]> {
  if (IS_LOCAL) {
    try {
      const raw = await fs.readFile(LOCAL_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return (await kv.get<Booking[]>('bookings')) ?? [];
}

async function writeAll(bookings: Booking[]) {
  if (IS_LOCAL) {
    await fs.writeFile(LOCAL_FILE, JSON.stringify(bookings, null, 2));
  } else {
    await kv.set('bookings', bookings);
  }
}

export async function GET() {
  const bookings = await readAll();
  return NextResponse.json(bookings);
}

export async function POST(req: Request) {
  const body = await req.json() as Booking;
  if (!body.id || !body.zone || !body.date || !body.name) {
    return NextResponse.json({ error: 'Ugyldig bestilling' }, { status: 400 });
  }
  const bookings = await readAll();

  // Conflict check server-side
  const conflict = bookings.some(b => {
    if (b.date !== body.date) return false;
    const zonesOverlap = b.zone === body.zone || b.zone === 'hele' || body.zone === 'hele';
    return zonesOverlap;
  });
  if (conflict) {
    return NextResponse.json({ error: 'Sonen er allerede booket denne dagen' }, { status: 409 });
  }

  bookings.push(body);
  await writeAll(bookings);
  return NextResponse.json(body, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 });
  const bookings = await readAll();
  const next = bookings.filter(b => b.id !== id);
  await writeAll(next);
  return NextResponse.json({ ok: true });
}
