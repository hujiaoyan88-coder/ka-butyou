/** Gaps after the previous actual date.
 *  On time from the first study day this lands on +1, +3, +7, +14, +30
 *  (next day, 3 days, 1 week, 2 weeks, about 1 month). */
export const REVIEW_GAPS = [1, 2, 4, 7, 16] as const;

export const REVIEW_MEANINGS = ["1日後", "3日後", "1週間後", "2週間後", "1か月後"] as const;

export const CHAPTER_COUNT = 70;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const WEEK = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type ReviewRecord = {
  done: boolean;
  date: string | null;
};

export type Reviews = [
  ReviewRecord,
  ReviewRecord,
  ReviewRecord,
  ReviewRecord,
  ReviewRecord,
];

export type Chapter = {
  id: number;
  note: string;
  startedOn: string | null;
  reviews: Reviews;
};

export type ReviewStatus = "locked" | "scheduled" | "upcoming" | "today" | "overdue" | "done";

export type ReviewView = {
  index: number;
  meaning: string;
  gap: number;
  /** Earliest date allowed for this review: the previous actual (or first study) date. */
  earliest: string;
  planned: string;
  actual: string | null;
  done: boolean;
  status: ReviewStatus;
  /** Actual minus planned, in days. Positive means late. */
  delta: number | null;
};

export type ChapterView = {
  started: boolean;
  reviews: ReviewView[];
  doneCount: number;
  openIndex: number | null;
};

export type Attention = "none" | "today" | "overdue";
export type Phase = "new" | "active" | "mastered";

export type ChapterSummary = {
  id: number;
  note: string;
  phase: Phase;
  attention: Attention;
  nextLabel: string | null;
  nextDate: string | null;
  lateDays: number;
  doneCount: number;
};

export type AgendaItem = {
  chapterId: number;
  note: string;
  reviewIndex: number;
  date: string;
  lateDays: number;
  attention: "today" | "overdue";
};

export type FilterId = "all" | "today" | "overdue" | "active" | "new" | "done";

export function emptyReviews(): Reviews {
  return [
    { done: false, date: null },
    { done: false, date: null },
    { done: false, date: null },
    { done: false, date: null },
    { done: false, date: null },
  ];
}

export function createChapters(): Chapter[] {
  return Array.from({ length: CHAPTER_COUNT }, (_, i) => ({
    id: i + 1,
    note: "",
    startedOn: null,
    reviews: emptyReviews(),
  }));
}

export function isISO(value: string): boolean {
  if (!ISO.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function localISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Days from `from` to `to`. Positive when `to` is later. */
export function diffDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000);
}

export function formatJP(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}月${d}日（${WEEK[day]}）`;
}

export function formatShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

function undone(): ReviewRecord {
  return { done: false, date: null };
}

function isDone(record: ReviewRecord): record is { done: true; date: string } {
  return record.done && record.date !== null && isISO(record.date);
}

export function buildView(chapter: Chapter, today: string | null): ChapterView {
  if (!chapter.startedOn || !isISO(chapter.startedOn)) {
    return { started: false, reviews: [], doneCount: 0, openIndex: null };
  }

  const reviews: ReviewView[] = [];
  let anchor = chapter.startedOn;
  let locked = false;
  let openIndex: number | null = null;
  let doneCount = 0;

  for (let i = 0; i < REVIEW_GAPS.length; i++) {
    const gap = REVIEW_GAPS[i];
    const earliest = anchor;
    const planned = addDays(anchor, gap);
    const record = chapter.reviews[i];

    if (locked || !isDone(record)) {
      let status: ReviewStatus = "scheduled";
      if (locked) status = "locked";
      else if (today) {
        if (planned < today) status = "overdue";
        else if (planned === today) status = "today";
        else status = "upcoming";
      }
      reviews.push({
        index: i,
        meaning: REVIEW_MEANINGS[i],
        gap,
        earliest,
        planned,
        actual: null,
        done: false,
        status,
        delta: null,
      });
      if (!locked && openIndex === null) openIndex = i;
      locked = true;
      anchor = planned;
      continue;
    }

    doneCount += 1;
    reviews.push({
      index: i,
      meaning: REVIEW_MEANINGS[i],
      gap,
      earliest,
      planned,
      actual: record.date,
      done: true,
      status: "done",
      delta: diffDays(planned, record.date),
    });
    anchor = record.date;
  }

  return { started: true, reviews, doneCount, openIndex };
}

export function summarize(chapter: Chapter, today: string | null): ChapterSummary {
  const view = buildView(chapter, today);
  if (!view.started) {
    return {
      id: chapter.id,
      note: chapter.note,
      phase: "new",
      attention: "none",
      nextLabel: null,
      nextDate: null,
      lateDays: 0,
      doneCount: 0,
    };
  }

  if (view.doneCount === REVIEW_GAPS.length) {
    return {
      id: chapter.id,
      note: chapter.note,
      phase: "mastered",
      attention: "none",
      nextLabel: null,
      nextDate: null,
      lateDays: 0,
      doneCount: view.doneCount,
    };
  }

  const open = view.reviews.find((review) => review.index === view.openIndex);
  const attention: Attention =
    open?.status === "today" || open?.status === "overdue" ? open.status : "none";
  const lateDays =
    open && today && open.planned < today ? diffDays(open.planned, today) : 0;

  return {
    id: chapter.id,
    note: chapter.note,
    phase: "active",
    attention,
    nextLabel: open ? `復習${open.index + 1}` : null,
    nextDate: open?.planned ?? null,
    lateDays,
    doneCount: view.doneCount,
  };
}

export function agendaFor(chapters: Chapter[], today: string | null): AgendaItem[] {
  if (!today) return [];
  const items: AgendaItem[] = [];
  for (const chapter of chapters) {
    const summary = summarize(chapter, today);
    if (summary.attention === "none" || !summary.nextDate || !summary.nextLabel) continue;
    items.push({
      chapterId: chapter.id,
      note: chapter.note,
      reviewIndex: summary.doneCount,
      date: summary.nextDate,
      lateDays: summary.lateDays,
      attention: summary.attention,
    });
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || a.chapterId - b.chapterId);
  return items;
}

export function nextUpcoming(chapters: Chapter[], today: string | null): AgendaItem | null {
  if (!today) return null;
  let best: AgendaItem | null = null;
  for (const chapter of chapters) {
    const summary = summarize(chapter, today);
    if (summary.phase !== "active" || !summary.nextDate || summary.nextDate <= today) continue;
    const item: AgendaItem = {
      chapterId: chapter.id,
      note: chapter.note,
      reviewIndex: summary.doneCount,
      date: summary.nextDate,
      lateDays: 0,
      attention: "today",
    };
    if (!best || item.date < best.date || (item.date === best.date && item.chapterId < best.chapterId)) {
      best = item;
    }
  }
  return best;
}

export function matchesFilter(summary: ChapterSummary, filter: FilterId): boolean {
  switch (filter) {
    case "all":
      return true;
    case "today":
      return summary.attention === "today";
    case "overdue":
      return summary.attention === "overdue";
    case "active":
      return summary.phase === "active";
    case "new":
      return summary.phase === "new";
    case "done":
      return summary.phase === "mastered";
  }
}

export function startChangeDrops(chapter: Chapter, date: string): boolean {
  let drop = false;
  for (const review of chapter.reviews) {
    const invalid = !isDone(review) || review.date < date;
    if (drop || invalid) {
      if (isDone(review)) return true;
      drop = true;
    }
  }
  return false;
}

export function applyStart(chapter: Chapter, date: string | null): Chapter {
  if (date === null || !isISO(date)) {
    return { ...chapter, startedOn: null, reviews: emptyReviews() };
  }
  let drop = false;
  const reviews = chapter.reviews.map((review) => {
    if (drop || !isDone(review) || review.date < date) {
      drop = true;
      return undone();
    }
    return review;
  });
  return { ...chapter, startedOn: date, reviews: asReviews(reviews) };
}

export function laterWouldDrop(chapter: Chapter, index: number, date: string): boolean {
  return chapter.reviews.slice(index + 1).some((review) => isDone(review) && review.date < date);
}

export function applyComplete(
  chapter: Chapter,
  index: number,
  date: string,
  today: string,
): { chapter: Chapter; error: string | null } {
  if (!chapter.startedOn || !isISO(chapter.startedOn)) {
    return { chapter, error: "先に初回の学習日を入れてください" };
  }
  if (index < 0 || index > 4 || !isISO(date)) {
    return { chapter, error: "日付を確認してください" };
  }
  if (date > today) {
    return { chapter, error: "今日より先の日付では完了にできません" };
  }
  const anchor = index === 0 ? chapter.startedOn : chapter.reviews[index - 1]?.date;
  if (index > 0 && !isDone(chapter.reviews[index - 1])) {
    return { chapter, error: "前の復習がまだ終わっていません" };
  }
  if (!anchor || date < anchor) {
    return { chapter, error: "前の日付より前にはできません" };
  }

  const dropLater = laterWouldDrop(chapter, index, date);
  const reviews = chapter.reviews.map((review, i) => {
    if (i < index) return review;
    if (i === index) return { done: true, date };
    if (dropLater) return undone();
    return review;
  });
  return { chapter: { ...chapter, reviews: asReviews(reviews) }, error: null };
}

export function applyUndo(chapter: Chapter, index: number): Chapter {
  const reviews = chapter.reviews.map((review, i) => (i >= index ? undone() : review));
  return { ...chapter, reviews: asReviews(reviews) };
}

export function hasLaterDone(chapter: Chapter, index: number): boolean {
  return chapter.reviews.slice(index + 1).some(isDone);
}

function asReviews(records: ReviewRecord[]): Reviews {
  return [records[0], records[1], records[2], records[3], records[4]];
}
