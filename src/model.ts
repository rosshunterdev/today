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
  notes?: string; // free text behind the line; missing on rows written before notes existed
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface DayRecord {
  day: string;
  binned: boolean; // the old page was thrown away
  updatedAt: string;
}

export interface Goal {
  id: string;
  week: string; // YYYY-MM-DD, the Monday of the week (4am logical days)
  text: string;
  notes?: string; // free text behind the line; missing on rows written before notes existed
  done: boolean;
  doneAt: string | null; // ISO timestamp
  position: string; // fractional index, compare with byPosition
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface WeekRecord {
  week: string;
  leftoversDismissed: boolean;
  updatedAt: string;
}
