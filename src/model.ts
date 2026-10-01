export type Mark = 'star' | 'bang' | 'question' | null;

export interface Task {
  id: string;
  day: string; // YYYY-MM-DD logical day
  text: string;
  done: boolean;
  doneAt: string | null; // ISO timestamp
  position: string; // fractional index, compare with byPosition
  indent: 0 | 1;
  mark: Mark;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface DayRecord {
  day: string;
  leftoversDismissed: boolean;
  updatedAt: string;
}
