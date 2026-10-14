import Dexie, { type EntityTable } from 'dexie';
import type { Task, DayRecord, Goal, WeekRecord } from '../model';

export const db = new Dexie('today') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
  days: EntityTable<DayRecord, 'day'>;
  goals: EntityTable<Goal, 'id'>;
  weeks: EntityTable<WeekRecord, 'week'>;
};

db.version(1).stores({
  tasks: 'id, day, updatedAt',
  days: 'day, updatedAt',
});

// v2: week goals. Existing tables are unchanged; listed again so the full schema reads in one place.
db.version(2).stores({
  tasks: 'id, day, updatedAt',
  days: 'day, updatedAt',
  goals: 'id, week, updatedAt',
  weeks: 'week, updatedAt',
});
