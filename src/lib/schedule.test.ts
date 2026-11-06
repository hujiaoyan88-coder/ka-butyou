import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  applyComplete,
  applyStart,
  applyUndo,
  buildView,
  createChapters,
  diffDays,
  summarize,
} from "./schedule.ts";

test("on-time curve is +1, +3, +7, +14, +30 from the first study day", () => {
  const start = "2026-11-01";
  const chapter = applyStart(createChapters()[0], start);
  const view = buildView(chapter, start);
  assert.deepEqual(
    view.reviews.map((review) => review.planned),
    ["2026-11-02", "2026-11-04", "2026-11-08", "2026-11-15", "2026-12-01"],
  );
  assert.equal(diffDays(start, "2026-12-01"), 30);
});

test("a late review shifts every date after it", () => {
  let chapter = applyStart(createChapters()[3], "2026-11-01");
  const done = applyComplete(chapter, 0, "2026-11-05", "2026-11-06");
  assert.equal(done.error, null);
  chapter = done.chapter;
  const view = buildView(chapter, "2026-11-06");
  assert.equal(view.reviews[0].actual, "2026-11-05");
  assert.equal(view.reviews[0].delta, 3);
  assert.deepEqual(
    view.reviews.slice(1).map((review) => review.planned),
    [
      addDays("2026-11-05", 2),
      addDays(addDays("2026-11-05", 2), 4),
      "2026-11-18",
      "2026-12-04",
    ],
  );
  assert.equal(view.reviews[1].status, "upcoming");
  const summary = summarize(chapter, "2026-11-06");
  assert.equal(summary.attention, "none");
  assert.equal(summary.nextDate, "2026-11-07");
});

test("overdue when the next review date is before today", () => {
  const chapter = applyStart(createChapters()[0], "2026-11-01");
  const summary = summarize(chapter, "2026-11-06");
  assert.equal(summary.attention, "overdue");
  assert.equal(summary.lateDays, 4);
  assert.equal(summary.nextLabel, "復習1");
});

test("cannot complete before the previous date or after today", () => {
  const chapter = applyStart(createChapters()[0], "2026-11-01");
  assert.match(applyComplete(chapter, 0, "2026-10-31", "2026-11-06").error ?? "", /前の日付/);
  assert.match(applyComplete(chapter, 0, "2026-11-07", "2026-11-06").error ?? "", /今日より先/);
  assert.match(applyComplete(chapter, 2, "2026-11-06", "2026-11-06").error ?? "", /前の復習/);
});

test("undo clears that review and everything after it", () => {
  let chapter = applyStart(createChapters()[1], "2026-11-01");
  chapter = applyComplete(chapter, 0, "2026-11-02", "2026-11-20").chapter;
  chapter = applyComplete(chapter, 1, "2026-11-04", "2026-11-20").chapter;
  chapter = applyUndo(chapter, 0);
  assert.ok(chapter.reviews.every((review) => !review.done));
  assert.equal(chapter.startedOn, "2026-11-01");
});

test("moving the first date drops reviews that fall before it", () => {
  let chapter = applyStart(createChapters()[2], "2026-11-01");
  chapter = applyComplete(chapter, 0, "2026-11-02", "2026-11-10").chapter;
  chapter = applyStart(chapter, "2026-11-03");
  assert.equal(chapter.startedOn, "2026-11-03");
  assert.ok(chapter.reviews.every((review) => !review.done));
  const view = buildView(chapter, "2026-11-10");
  assert.equal(view.reviews[0].planned, "2026-11-04");
});
