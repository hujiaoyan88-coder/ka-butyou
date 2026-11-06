import { cn } from "@/lib/cn";
import {
  type AgendaItem,
  type Chapter,
  type ChapterSummary,
  type FilterId,
  agendaFor,
  formatJP,
  matchesFilter,
  nextUpcoming,
  summarize,
} from "@/lib/schedule";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "today", label: "今日" },
  { id: "overdue", label: "遅れ" },
  { id: "active", label: "進行中" },
  { id: "new", label: "未着手" },
  { id: "done", label: "修了" },
];

type Props = {
  chapters: Chapter[];
  today: string | null;
  filter: FilterId;
  selectedId: number | null;
  onFilter: (filter: FilterId) => void;
  onSelect: (id: number) => void;
  onQuickDone: (id: number, reviewIndex: number) => void;
};

export function HomePanel({
  chapters,
  today,
  filter,
  selectedId,
  onFilter,
  onSelect,
  onQuickDone,
}: Props) {
  const summaries = chapters.map((chapter) => summarize(chapter, today));
  const mastered = summaries.filter((summary) => summary.phase === "mastered").length;
  const agenda = agendaFor(chapters, today);
  const todayCount = agenda.filter((item) => item.attention === "today").length;
  const overdueCount = agenda.filter((item) => item.attention === "overdue").length;
  const upcoming = nextUpcoming(chapters, today);
  const started = summaries.some((summary) => summary.phase !== "new");

  return (
    <div>
      <header className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-md border-2 border-stamp font-display text-xl text-stamp"
          aria-hidden="true"
        >
          復
        </div>
        <div>
          <h1 className="font-display text-2xl leading-tight">カーブ帳</h1>
          <p className="text-sm text-muted">英単語70章の復習日</p>
        </div>
      </header>

      <p className="mt-4 text-sm text-muted">
        初回の日付を入れると、1日後・3日後・1週間後・2週間後・1か月後が出ます。実施した日を入れると、その次から予定が動きます。
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="今日" value={today ? String(todayCount) : "—"} hot={todayCount > 0} />
        <Stat label="遅れ" value={today ? String(overdueCount) : "—"} hot={overdueCount > 0} />
        <Stat label="修了" value={`${mastered}`} moss={mastered > 0} hint="/70" />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-soft" aria-hidden="true">
        <div className="h-full bg-moss" style={{ width: `${(mastered / 70) * 100}%` }} />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onFilter(item.id)}
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-sm font-medium",
                active ? "bg-ink text-sheet" : "border border-line bg-sheet text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {summaries.map((summary) => (
          <ChapterCell
            key={summary.id}
            summary={summary}
            selected={summary.id === selectedId}
            dim={filter !== "all" && !matchesFilter(summary, filter)}
            onSelect={onSelect}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        <Legend swatch="border border-line bg-sheet" label="未着手" />
        <Legend swatch="bg-ink-soft" label="進行中" />
        <Legend swatch="bg-stamp" label="今日・遅れ" />
        <Legend swatch="bg-moss" label="5回修了" />
      </ul>

      <section className="mt-6">
        <h2 className="font-display text-xl">今日と、遅れ</h2>
        {agenda.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {!started
              ? "章番号を押して、初回の学習日を入れてください。"
              : upcoming
                ? `次の復習は ${formatJP(upcoming.date)}、第${upcoming.chapterId}章の復習${upcoming.reviewIndex + 1}です。`
                : "遅れも、今日の分もありません。"}
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {agenda.map((item) => (
              <AgendaRow key={`${item.chapterId}-${item.reviewIndex}`} item={item} onSelect={onSelect} onQuickDone={onQuickDone} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hot, moss, hint }: { label: string; value: string; hot?: boolean; moss?: boolean; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-sheet px-3 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-3xl leading-none tabular-nums",
          hot ? "text-stamp" : moss ? "text-moss" : "text-ink",
        )}
      >
        {value}
        {hint ? <span className="ml-1 font-sans text-sm text-muted">{hint}</span> : null}
      </p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-sm", swatch)} aria-hidden="true" />
      {label}
    </li>
  );
}

function ChapterCell({
  summary,
  selected,
  dim,
  onSelect,
}: {
  summary: ChapterSummary;
  selected: boolean;
  dim: boolean;
  onSelect: (id: number) => void;
}) {
  const hot = summary.attention === "today" || summary.attention === "overdue";
  const label = [
    `第${summary.id}章`,
    summary.note,
    summary.phase === "mastered" ? "修了" : summary.nextLabel,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(summary.id)}
      className={cn(
        "flex h-11 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors",
        summary.phase === "new" && "border border-line bg-sheet text-muted",
        summary.phase === "active" && !hot && "border border-line bg-ink-soft text-ink",
        hot && "bg-stamp text-sheet",
        summary.phase === "mastered" && "bg-moss text-sheet",
        selected && "ring-2 ring-ink ring-offset-2 ring-offset-paper",
        dim && "opacity-40",
      )}
    >
      {String(summary.id).padStart(2, "0")}
    </button>
  );
}

function AgendaRow({
  item,
  onSelect,
  onQuickDone,
}: {
  item: AgendaItem;
  onSelect: (id: number) => void;
  onQuickDone: (id: number, reviewIndex: number) => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-line bg-sheet p-3">
      <button type="button" onClick={() => onSelect(item.chapterId)} className="min-h-11 min-w-0 flex-1 text-left">
        <p className="font-medium">
          第{item.chapterId}章{item.note ? ` ${item.note}` : ""}
        </p>
        <p className="text-sm text-muted">
          復習{item.reviewIndex + 1} · {formatJP(item.date)}
          {item.attention === "overdue" ? ` · ${item.lateDays}日遅れ` : " · 今日"}
        </p>
      </button>
      <button
        type="button"
        onClick={() => onQuickDone(item.chapterId, item.reviewIndex)}
        className="h-11 shrink-0 rounded-lg bg-stamp px-3 text-sm font-medium text-sheet"
      >
        今日完了
      </button>
    </li>
  );
}
