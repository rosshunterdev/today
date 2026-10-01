import { db } from './db';
import type { Task } from '../model';
import { byPosition, positionBetween } from '../order/position';
import { copyForToday, isUnfinished, leftoversSourceDay } from '../day/leftovers';
import { listDay, nowIso } from './tasks';

export interface Leftovers {
  day: string;
  tasks: Task[];
}

export async function findLeftovers(today: string): Promise<Leftovers | null> {
  const record = await db.days.get(today);
  if (record?.leftoversDismissed) return null;
  const earlier = await db.tasks.where('day').below(today).toArray();
  const source = leftoversSourceDay(earlier, today);
  if (!source) return null;
  const tasks = earlier.filter((t) => t.day === source && isUnfinished(t)).sort(byPosition);
  return { day: source, tasks };
}

export async function dismissLeftovers(today: string): Promise<void> {
  await db.days.put({ day: today, leftoversDismissed: true, updatedAt: nowIso() });
}

export async function bringOver(today: string, ids: string[]): Promise<void> {
  await db.transaction('rw', db.tasks, db.days, async () => {
    const sources = (await db.tasks.bulkGet(ids)).filter((t): t is Task => t !== undefined).sort(byPosition);
    const existing = await listDay(today);
    let prev = existing[existing.length - 1]?.position ?? null;
    const now = nowIso();
    const copies = sources.map((s) => {
      prev = positionBetween(prev, null);
      return copyForToday(s, today, prev, crypto.randomUUID(), now);
    });
    await db.tasks.bulkAdd(copies);
    await dismissLeftovers(today);
  });
}
