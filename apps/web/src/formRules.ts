export interface QuestionFormValues {
  qtype: string;
  section: string;
  prompt: string;
  options: string;
  answer: string;
  acceptedVariants: string;
  tags: string;
  difficulty: string;
}

export type FormErrors = Partial<Record<"prompt" | "options" | "answer", string>>;

const LETTERS = "ABCDEFGH";

export function validateField(form: QuestionFormValues, key: keyof FormErrors): string | undefined {
  if (key === "prompt") {
    if (!form.prompt.trim()) return "Prompt is required.";
    return undefined;
  }
  if (key === "options") {
    const opts = form.options.split("|").map((s) => s.trim()).filter(Boolean);
    if (opts.length < 2) return "MCQ needs at least 2 options separated by |.";
    return undefined;
  }
  if (key === "answer") {
    const answer = form.answer.trim();
    if (!answer) return "Answer is required.";
    if (form.qtype === "mcq") {
      const letter = answer.toUpperCase();
      if (!LETTERS.includes(letter)) return "Answer must be a letter (A–H).";
      const opts = form.options.split("|").map((s) => s.trim()).filter(Boolean);
      const idx = LETTERS.indexOf(letter);
      if (idx >= opts.length) return `Answer letter must match an option (options: A–${LETTERS[Math.max(opts.length - 1, 0)]}).`;
    }
    return undefined;
  }
  return undefined;
}

export function validateForm(form: QuestionFormValues): FormErrors {
  const errors: FormErrors = {};
  const keys: (keyof FormErrors)[] = ["prompt", "options", "answer"];
  for (const key of keys) {
    if (key === "options" && form.qtype !== "mcq") continue;
    const msg = validateField(form, key);
    if (msg) errors[key] = msg;
  }
  return errors;
}
