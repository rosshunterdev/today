import Dexie, { type EntityTable } from 'dexie';
import type { Task, DayRecord } from '../model';

export const db = new Dexie('today') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
  days: EntityTable<DayRecord, 'day'>;
};

db.version(1).stores({
  tasks: 'id, day, updatedAt',
  days: 'day, updatedAt',
});
