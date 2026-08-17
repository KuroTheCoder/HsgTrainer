import { describe, expect, it } from "vitest";
import { isDue, nextSchedule, MAX_LEVEL, INTERVALS_DAYS } from "./vocabSchedule";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-08-17T00:00:00Z");

describe("nextSchedule", () => {
  it("knew advances level and schedules by the new level's interval", () => {
    const s = nextSchedule(0, "knew", NOW);
    expect(s.lvl).toBe(1);
    expect(Date.parse(s.due) - NOW).toBe(INTERVALS_DAYS[1] * DAY);
  });

  it("almost keeps level ≥1 and due tomorrow", () => {
    const s = nextSchedule(2, "almost", NOW);
    expect(s.lvl).toBe(2);
    expect(Date.parse(s.due) - NOW).toBe(DAY);
  });

  it("forgot resets to level 0 and due immediately", () => {
    const s = nextSchedule(4, "forgot", NOW);
    expect(s.lvl).toBe(0);
    expect(Date.parse(s.due)).toBe(NOW);
  });

  it("knew caps at MAX_LEVEL", () => {
    const s = nextSchedule(MAX_LEVEL, "knew", NOW);
    expect(s.lvl).toBe(MAX_LEVEL);
  });

  it("isDue: missing due and past due are due, future due is not", () => {
    expect(isDue({}, NOW)).toBe(true);
    expect(isDue({ due: new Date(NOW - 1).toISOString() }, NOW)).toBe(true);
    expect(isDue({ due: new Date(NOW + 1).toISOString() }, NOW)).toBe(false);
  });
});
