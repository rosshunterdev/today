import type { Task } from '../model';

let n = 0;

export function makeTask(overrides: Partial<Task> = {}): Task {
  n += 1;
  return {
    id: `task-${n}`,
    day: '2026-10-01',
    text: `task ${n}`,
    done: false,
    doneAt: null,
    position: 'a0',
    indent: 0,
    mark: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    deleted: false,
    ...overrides,
  };
}
