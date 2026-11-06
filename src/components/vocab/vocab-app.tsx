import { useEffect, useState } from "react";
import { ChapterPanel } from "@/components/vocab/chapter-panel";
import { HomePanel } from "@/components/vocab/home-panel";
import { RulesPanel } from "@/components/vocab/rules-panel";
import { useBook } from "@/lib/book";
import { cn } from "@/lib/cn";
import {
  type FilterId,
  applyComplete,
  applyStart,
  createChapters,
  emptyReviews,
} from "@/lib/schedule";

export function VocabApp() {
  const { chapters, today, setChapters, replace } = useBook();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const selected = chapters.find((chapter) => chapter.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId !== null) window.scrollTo(0, 0);
  }, [selectedId]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8 lg:py-8">
      <div className={cn("lg:col-span-2", selected && "hidden lg:block")}>
        <HomePanel
          chapters={chapters}
          today={today}
          filter={filter}
          selectedId={selectedId}
          onFilter={setFilter}
          onSelect={setSelectedId}
          onQuickDone={(id, reviewIndex) => {
            if (!today) return;
            const chapter = chapters.find((item) => item.id === id);
            if (!chapter) return;
            const result = applyComplete(chapter, reviewIndex, today, today);
            if (!result.error) replace(id, result.chapter);
          }}
        />
        <RulesPanel
          chapters={chapters}
          onReplace={setChapters}
          onResetAll={() => {
            setSelectedId(null);
            setChapters(createChapters());
          }}
        />
      </div>

      <aside className={cn("lg:col-span-1", !selected && "hidden lg:block")}>
        {selected ? (
          <div className="lg:sticky lg:top-6">
            <ChapterPanel
              chapter={selected}
              today={today}
              onBack={() => setSelectedId(null)}
              onNote={(note) => replace(selected.id, { ...selected, note })}
              onStart={(date) => replace(selected.id, applyStart(selected, date))}
              onChapter={(chapter) => replace(selected.id, chapter)}
              onReset={() =>
                replace(selected.id, {
                  id: selected.id,
                  note: "",
                  startedOn: null,
                  reviews: emptyReviews(),
                })
              }
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-sheet p-5">
            <h2 className="font-display text-xl">章を選ぶ</h2>
            <p className="mt-2 text-sm text-muted">
              番号を押すと、その章の学習日と5回の復習日を編集できます。実施日を変えると、その次からの予定が動きます。
            </p>
          </div>
        )}
      </aside>
    </main>
  );
}
