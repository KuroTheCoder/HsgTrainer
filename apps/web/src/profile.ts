/** Personal profile — stored locally (anonymous-first, like settings / word list). */

const KEY = "hsg-profile";

export const PROFILE_CHANGED_EVENT = "hsg-profile-changed";

export const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

export const CEFR_GOALS = ["A2", "B1", "B2", "C1", "C2"];

export interface Profile {
  name: string;
  targetGrade: string;
  province: string;
  cefrGoal: string;
  examDate: string;
}

const EMPTY: Profile = { name: "", targetGrade: "", province: "", cefrGoal: "", examDate: "" };

export function getProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Profile>;
      if (typeof v === "object" && v !== null) {
        return {
          name: typeof v.name === "string" ? v.name : "",
          targetGrade: typeof v.targetGrade === "string" ? v.targetGrade : "",
          province: typeof v.province === "string" ? v.province : "",
          cefrGoal: typeof v.cefrGoal === "string" ? v.cefrGoal : "",
          examDate: typeof v.examDate === "string" ? v.examDate : "",
        };
      }
    }
  } catch {
    /* private mode */
  }
  return { ...EMPTY };
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}
