import { useEffect, useState } from "react";
import { z } from "zod";
import {
  type Chapter,
  createChapters,
  isISO,
} from "@/lib/schedule";

const STORAGE_KEY = "curve-cho-v1";

const reviewSchema = z
  .object({
    done: z.boolean(),
    date: z.string().nullable(),
  })
  .refine((review) => {
    if (review.done) return review.date !== null && isISO(review.date);
    return review.date === null;
  });

const chapterSchema = z.object({
  id: z.number().int().min(1).max(70),
  note: z.string().max(40),
  startedOn: z
    .string()
    .nullable()
    .refine((value) => value === null || isISO(value)),
  reviews: z.tuple([reviewSchema, reviewSchema, reviewSchema, reviewSchema, reviewSchema]),
});

const bookSchema = z.object({
  version: z.literal(1),
  chapters: z
    .array(chapterSchema)
    .length(70)
    .refine((chapters) => chapters.every((chapter, index) => chapter.id === index + 1)),
});

export function parseBook(raw: unknown): Chapter[] | null {
  const parsed = bookSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data.chapters.map((chapter) => ({
    id: chapter.id,
    note: chapter.note,
    startedOn: chapter.startedOn,
    reviews: chapter.reviews.map((review) => ({
      done: review.done,
      date: review.date,
    })) as Chapter["reviews"],
  }));
}

export function serializeBook(chapters: Chapter[]): string {
  return JSON.stringify({ version: 1, chapters }, null, 2);
}

export function useBook() {
  const [chapters, setChapters] = useState<Chapter[]>(createChapters);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded = parseBook(JSON.parse(raw));
        if (loaded) setChapters(loaded);
      }
    } catch {
      /* ignore broken local data */
    }
    const stamp = () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      setToday(`${y}-${m}-${d}`);
    };
    stamp();
    setReady(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") stamp();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, serializeBook(chapters));
  }, [chapters, ready]);

  const replace = (id: number, next: Chapter) => {
    setChapters((current) => current.map((chapter) => (chapter.id === id ? next : chapter)));
  };

  return { chapters, today, ready, setChapters, replace };
}
