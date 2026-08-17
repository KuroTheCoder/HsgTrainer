import { useState } from "react";
import { api } from "../api";
import { IconBug } from "../icons";

const QUESTION_REASONS = ["Wrong key", "Prompt is unclear / has errors", "Duplicate question", "Audio missing or wrong", "Other"];
const BUG_REASONS = ["Something broke", "Wrong or missing content", "Idea / suggestion", "Other"];

export default function ReportBox({
  questionId,
  label = "Report",
  bug = false,
}: {
  questionId?: number;
  label?: string;
  bug?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reasons = bug ? BUG_REASONS : QUESTION_REASONS;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.report({
        type: bug ? "bug" : "question",
        questionId: bug ? undefined : questionId,
        reason,
        message: message.trim() || undefined,
      });
      setSent(true);
      setReason("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "report failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="notebox">
      <button className="btn btn-sm btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={label}>
        <IconBug size={13} />
        {label}
      </button>
      {open && (
        <div className="report-box" role="dialog" aria-label={label}>
          {sent ? (
            <>
              <p className="small"><b>Thanks — report sent.</b> The team will review it.</p>
              <button className="btn btn-sm btn-ghost" onClick={() => { setSent(false); setOpen(false); }}>
                Close
              </button>
            </>
          ) : (
            <>
              <p className="small muted">What's wrong? Pick a reason:</p>
              <div className="report-reasons">
                {reasons.map((r) => (
                  <button
                    key={r}
                    className={`chip-btn ${reason === r ? "active" : ""}`}
                    aria-pressed={reason === r}
                    onClick={() => setReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                placeholder="Add details (optional)…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-label="Report details"
              />
              {error && <div className="banner error" role="alert">{error}</div>}
              <div className="row">
                <button className="btn btn-sm btn-primary" onClick={() => void submit()} disabled={!reason || busy}>
                  {busy ? "Sending…" : "Send report"}
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </span>
  );
}