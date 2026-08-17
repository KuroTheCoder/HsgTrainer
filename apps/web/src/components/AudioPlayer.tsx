import { useState } from "react";
import { IconHeadphones } from "../icons";
import { t } from "../i18n";

/** Plays a question's audio clip. Files live in /audio/ (drop mp3s there —
 *  missing files render as an unavailable chip, matching the sfx convention). */
export default function AudioPlayer({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="tag bad audio-missing" title={t("Audio file not found — see apps/web/public/audio/README.md")}>
        <IconHeadphones size={13} /> {t("audio unavailable")}
      </span>
    );
  }

  return (
    <div className="audio-player">
      <audio
        controls
        preload="none"
        src={src}
        onError={() => setFailed(true)}
        aria-label={t("Audio clip — replay if needed")}
      />
    </div>
  );
}