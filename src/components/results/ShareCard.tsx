import { forwardRef } from "react";
import { formatElapsed } from "@/domain/timer";
import type { TestResult } from "@/domain/types";

type ShareCardProps = {
  result: TestResult;
};

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { result },
  ref,
) {
  const beforeText = result.challengeResults.map((item) => item.beforeText).join("\n");
  const targetText = result.challengeResults.map((item) => item.targetText).join("\n");
  const finalText = result.challengeResults.map((item) => item.finalText).join("\n");

  return (
    <div className="share-card" ref={ref}>
      <div className="share-left">
        <strong>{formatElapsed(result.elapsedMs)}</strong>
        <span>
          {result.config.mode === "target-match" ? "Target Match" : "Drill"}<br />
          {result.config.challengeCount}-part challenge<br />
          {result.config.platform}: {result.config.mousePolicy === "keyboard-only" ? "keyboard only" : "mouse allowed"}
        </span>
        <em>shortcutting</em>
      </div>
      <div className="share-right">
        <p>challenge before / after</p>
        <div className="share-pair">
          <div className="share-pane">
            <span className="share-pane-label">before</span>
            <span className="before">{beforeText}</span>
          </div>
          <div className="share-pane">
            <span className="share-pane-label">after</span>
            <span className="after">{targetText}</span>
          </div>
        </div>
        <small>
          final text matched: {result.totalKeystrokes} keystrokes, {result.hintsUsed} hints, {result.mouseActions} mouse actions
          <span className="share-final" aria-label="Final text">{finalText}</span>
        </small>
      </div>
    </div>
  );
});
