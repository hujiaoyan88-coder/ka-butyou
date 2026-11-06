import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  type Chapter,
  type ReviewView,
  applyComplete,
  applyUndo,
  buildView,
  formatJP,
  formatShort,
  hasLaterDone,
  laterWouldDrop,
  startChangeDrops,
} from "@/lib/schedule";

type Props = {
  chapter: Chapter;
  today: string | null;
  onBack: () => void;
  onNote: (note: string) => void;
  onStart: (date: string | null) => void;
  onChapter: (chapter: Chapter) => void;
  onReset: () => void;
};

export function ChapterPanel({ chapter, today, onBack, onNote, onStart, onChapter, onReset }: Props) {
  const view = buildView(chapter, today);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<{ index: number; message: string } | null>(null);

  useEffect(() => {
    setDraft(today ?? "");
    setError(null);
  }, [chapter.id, view.openIndex, today]);

  const requestStart = (date: string | null) => {
    if (date === null) {
      const dirty = chapter.startedOn !== null && chapter.reviews.some((review) => review.done);
      if (dirty && !window.confirm("初回の日付を消すと、この章の復習記録も消えます。")) return;
      onStart(null);
      return;
    }
    if (chapter.startedOn && startChangeDrops(chapter, date)) {
      if (!window.confirm("新しい初回日より前になる復習記録は消えます。")) return;
    }
    onStart(date);
  };

  const requestComplete = (index: number, date: string) => {
    if (!today) return;
    if (laterWouldDrop(chapter, index, date)) {
      if (!window.confirm("この日付にすると、それより前になってしまう後の復習記録は消えます。")) {
        setError(null);
        return;
      }
    }
    const result = applyComplete(chapter, index, date, today);
    if (result.error) {
      setError({ index, message: result.error });
      return;
    }
    setError(null);
    onChapter(result.chapter);
  };

  const requestUndo = (index: number) => {
    if (hasLaterDone(chapter, index)) {
      if (!window.confirm("取り消すと、このあとの完了も外れます。")) return;
    }
    onChapter(applyUndo(chapter, index));
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-paper py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          一覧
        </button>
        <h2 className="font-display text-2xl leading-none">第{chapter.id}章</h2>
      </div>

      <label className="mt-2 block">
        <span className="text-sm text-muted">メモ（任意）</span>
        <input
          value={chapter.note}
          maxLength={40}
          placeholder="範囲や品詞など"
          onChange={(event) => onNote(event.target.value.slice(0, 40))}
          className="mt-1 h-11 w-full rounded-lg border border-line bg-sheet px-3 text-base text-ink placeholder:text-muted"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm text-muted">初回の学習日</span>
        <input
          type="date"
          aria-label="初回の学習日"
          value={chapter.startedOn ?? ""}
          onChange={(event) => requestStart(event.target.value || null)}
          className="mt-1 h-11 w-full rounded-lg border border-line bg-sheet px-3 text-base text-ink"
        />
      </label>
      {chapter.startedOn ? (
        <button type="button" onClick={() => requestStart(null)} className="mt-2 h-11 text-sm font-medium text-stamp">
          初回の日付を消す
        </button>
      ) : (
        <p className="mt-2 text-sm text-muted">ここを入れると、5回分の復習日が出ます。</p>
      )}

      {view.started ? (
        <ol className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <li className="shrink-0 rounded-lg border border-line bg-sheet px-3 py-2">
            <p className="text-sm text-muted">初回</p>
            <p className="font-medium tabular-nums">{formatShort(chapter.startedOn!)}</p>
          </li>
          {view.reviews.map((review) => (
            <li key={review.index} className="shrink-0 rounded-lg border border-line bg-sheet px-3 py-2">
              <p className="text-sm text-muted">復習{review.index + 1}</p>
              <p className="font-medium tabular-nums">{formatShort(review.actual ?? review.planned)}</p>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-4 grid gap-3">
        {view.reviews.map((review) => (
          <ReviewCard
            key={review.index}
            review={review}
            today={today}
            open={review.index === view.openIndex}
            draft={draft}
            error={error?.index === review.index ? error.message : null}
            onDraft={setDraft}
            onComplete={requestComplete}
            onUndo={requestUndo}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!window.confirm(`第${chapter.id}章の記録を消します。よろしいですか？`)) return;
          onReset();
        }}
        className="mt-6 h-11 text-sm font-medium text-stamp"
      >
        この章をリセット
      </button>
    </div>
  );
}

function ReviewCard({
  review,
  today,
  open,
  draft,
  error,
  onDraft,
  onComplete,
  onUndo,
}: {
  review: ReviewView;
  today: string | null;
  open: boolean;
  draft: string;
  error: string | null;
  onDraft: (value: string) => void;
  onComplete: (index: number, date: string) => void;
  onUndo: (index: number) => void;
}) {
  const shown = review.actual ?? review.planned;
  return (
    <article className="rounded-xl border border-line bg-sheet p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">
            復習{review.index + 1}
            <span className="ml-2 text-sm font-normal text-muted">{review.meaning}</span>
          </h3>
          <p className="text-sm text-muted">前回から{review.gap}日</p>
        </div>
        <StatusPill status={review.status} lateDays={review.delta} />
      </div>

      <p className="mt-3 font-display text-2xl tabular-nums">{formatJP(shown)}</p>
      {review.done && review.actual && review.actual !== review.planned ? (
        <p className="mt-1 text-sm text-muted">
          予定は{formatJP(review.planned)}。この実施日で、次の予定を組み直しました。
        </p>
      ) : null}
      {!review.done && review.status === "locked" ? (
        <p className="mt-1 text-sm text-muted">仮の予定です。前の回の実施日が入ると動きます。</p>
      ) : null}
      {!review.done && review.status !== "locked" ? <p className="mt-1 text-sm text-muted">予定</p> : null}
      {review.done ? <p className="mt-1 text-sm text-moss">実施日</p> : null}

      {open && today ? (
        <div className="mt-3 grid gap-2">
          <label className="grid gap-2">
            <span className="text-sm text-muted">実施した日</span>
            <input
              type="date"
              aria-label={`復習${review.index + 1}の実施日`}
              min={review.earliest}
              max={today}
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-paper px-3 text-base text-ink"
            />
          </label>
          <button
            type="button"
            disabled={!draft}
            onClick={() => onComplete(review.index, draft)}
            className="h-11 rounded-lg bg-stamp text-base font-medium text-sheet disabled:opacity-40"
          >
            この日で完了
          </button>
          {error ? <p className="text-sm text-stamp">{error}</p> : null}
        </div>
      ) : null}

      {review.done && review.actual && today ? (
        <div className="mt-3 grid gap-2">
          <label className="grid gap-2">
            <span className="text-sm text-muted">実施日を変える</span>
            <input
              type="date"
              aria-label={`復習${review.index + 1}の実施日を変更`}
              min={review.earliest}
              max={today}
              value={review.actual}
              onChange={(event) => {
                if (event.target.value) onComplete(review.index, event.target.value);
              }}
              className="h-11 w-full rounded-lg border border-line bg-paper px-3 text-base text-ink"
            />
          </label>
          <button
            type="button"
            onClick={() => onUndo(review.index)}
            className="h-11 rounded-lg border border-line text-sm font-medium text-ink"
          >
            この回を取り消す
          </button>
        </div>
      ) : null}
    </article>
  );
}

function StatusPill({ status, lateDays }: { status: ReviewView["status"]; lateDays: number | null }) {
  if (status === "done") {
    const late = lateDays !== null && lateDays > 0;
    const early = lateDays !== null && lateDays < 0;
    return (
      <span className="rounded-full bg-moss-soft px-3 py-1 text-sm text-moss">
        {late ? `${lateDays}日遅れで完了` : early ? `${Math.abs(lateDays)}日早く完了` : "完了"}
      </span>
    );
  }
  if (status === "today") return <span className="rounded-full bg-stamp px-3 py-1 text-sm text-sheet">今日</span>;
  if (status === "overdue") return <span className="rounded-full bg-stamp-soft px-3 py-1 text-sm text-stamp">遅れ</span>;
  if (status === "locked") return <span className="rounded-full bg-ink-soft px-3 py-1 text-sm text-muted">あとで</span>;
  return <span className="rounded-full bg-ink-soft px-3 py-1 text-sm text-ink">予定</span>;
}
