import { useState } from "react";
import { CEFR_GOALS, GRADES, getProfile, saveProfile, type Profile } from "../profile";
import { getWordList } from "../vocab";
import { getNotes } from "../reader";
import { IconBook, IconCheck, IconPen, IconShield, IconTrend } from "../icons";
import { t } from "../i18n";

export default function Account() {
  const [form, setForm] = useState<Profile>(getProfile());
  const [saved, setSaved] = useState(false);

  const set = (k: keyof Profile, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const submit = () => {
    saveProfile(form);
    setSaved(true);
  };

  const wordCount = Object.keys(getWordList()).length;
  const noteCount = Object.keys(getNotes()).length;

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t("Account")}</h2>
      </div>

      <div className="banner info" role="status">
        <IconShield size={15} />
        <div>
          <b>{t("No account needed")}</b> — {t("this profile lives only in your browser, like your settings and word list. Clear your browser data and it's gone. Nothing is sent to a server.")}
        </div>
      </div>

      <div className="card panel">
        <h3>{t("Personal information")}</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("Optional — used to personalise your training targets. Stored on this device only.")}
        </p>
        <div className="field-grid">
          <label className="field">
            {t("Display name")}
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Minh"
              autoComplete="name"
            />
          </label>
          <label className="field">
            {t("Target grade")}
            <select value={form.targetGrade} onChange={(e) => set("targetGrade", e.target.value)}>
              <option value="">—</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {t("Grade {g}", { g })}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("Province / city")}
            <input
              value={form.province}
              onChange={(e) => set("province", e.target.value)}
              placeholder="e.g. Hà Nội"
              autoComplete="address-level1"
            />
          </label>
          <label className="field">
            {t("CEFR goal")}
            <select value={form.cefrGoal} onChange={(e) => set("cefrGoal", e.target.value)}>
              <option value="">—</option>
              {CEFR_GOALS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("Exam date (optional)")}
            <input type="date" value={form.examDate} onChange={(e) => set("examDate", e.target.value)} />
          </label>
        </div>
        <div className="row" style={{ marginTop: 4 }}>
          <button className="btn btn-primary" onClick={submit}>
            <IconCheck size={15} /> {t("Save profile")}
          </button>
          {saved && (
            <span className="banner ok" role="status" style={{ margin: 0 }}>
              {t("Saved on this device.")}
            </span>
          )}
        </div>
      </div>

      <div className="card panel">
        <h3>
          <IconTrend size={16} aria-hidden="true" /> {t("What's stored on this device")}
        </h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("You're anonymous-first. Every personalised feature keeps its data here, in your browser.")}
        </p>
        <div className="stat-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-num">{form.name ? "✓" : "—"}</div>
            <div className="stat-label">{t("Profile")}</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{wordCount}</div>
            <div className="stat-label">
              <IconBook size={12} aria-hidden="true" /> {t("Word list")}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{noteCount}</div>
            <div className="stat-label">
              <IconPen size={12} aria-hidden="true" /> {t("Notes & highlights")}
            </div>
          </div>
        </div>
        <p className="hint" style={{ marginBottom: 0 }}>
          {t("Your progress and mistakes ledger live on the server under an anonymous ID — never linked to your name.")}
        </p>
      </div>
    </div>
  );
}
