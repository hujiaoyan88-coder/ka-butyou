import { useRef, useState } from "react";
import { parseBook, serializeBook } from "@/lib/book";
import { REVIEW_GAPS, REVIEW_MEANINGS, type Chapter } from "@/lib/schedule";

type Props = {
  chapters: Chapter[];
  onReplace: (chapters: Chapter[]) => void;
  onResetAll: () => void;
};

export function RulesPanel({ chapters, onReplace, onResetAll }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onExport = () => {
    const blob = new Blob([serializeBook(chapters)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "curve-cho.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("控えを書き出しました");
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const loaded = parseBook(JSON.parse(await file.text()));
      if (!loaded) {
        setMessage("このファイルは読めませんでした");
        return;
      }
      onReplace(loaded);
      setMessage("読み込みました");
    } catch {
      setMessage("このファイルは読めませんでした");
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-line bg-sheet p-5">
      <h2 className="font-display text-xl">復習の決まり</h2>
      <p className="mt-2 text-sm text-muted">
        初回の学習日を入れると、復習が5回分出ます。日付はいつも「直前に実際にやった日」から数えます。予定どおりだと、学習日から次の並びです。
      </p>
      <ol className="mt-4 grid gap-2">
        {REVIEW_MEANINGS.map((meaning, index) => (
          <li key={meaning} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
            <span className="font-medium">復習{index + 1}</span>
            <span className="text-sm text-muted">
              {meaning}
              <span className="ml-2 tabular-nums">前回から{REVIEW_GAPS[index]}日</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">
        1か月は30日で計算しています。遅れて完了した日を入れると、その次からの予定が同じ日数だけ後ろへ動きます。早く終えたときも、その日から数え直します。
      </p>

      <h3 className="mt-6 font-display text-lg">記録の控え</h3>
      <p className="mt-1 text-sm text-muted">この端末の中だけに保存しています。消えると困るときは書き出してください。</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onExport}
          className="h-11 rounded-lg border border-line bg-paper px-4 text-sm font-medium text-ink"
        >
          書き出す
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-11 rounded-lg border border-line bg-paper px-4 text-sm font-medium text-ink"
        >
          読み込む
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("70章すべての記録を消します。よろしいですか？")) return;
            onResetAll();
            setMessage("消しました");
          }}
          className="h-11 rounded-lg px-4 text-sm font-medium text-stamp"
        >
          すべて消す
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          void onImport(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {message ? <p className="mt-3 text-sm text-moss">{message}</p> : null}
    </section>
  );
}
