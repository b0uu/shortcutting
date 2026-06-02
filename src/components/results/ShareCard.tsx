import { forwardRef } from "react";
import { formatElapsed } from "@/domain/timer";
import { themeCssVariables } from "@/domain/themes";
import type { TestResult, ThemeColors } from "@/domain/types";

type ShareCardProps = {
  result: TestResult;
  themeColors: ThemeColors;
};

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { result, themeColors },
  ref,
) {
  const selectedChallenge = result.challengeResults.find((item) => item.challengeId === result.shareChallengeId)
    ?? result.challengeResults.at(-1)
    ?? result.challengeResults[0];
  const beforeText = selectedChallenge?.beforeText ?? "";
  const targetText = selectedChallenge?.targetText ?? "";
  const finalText = result.challengeResults.map((item) => item.finalText).join("\n");

  return (
    <div className="share-card" ref={ref} style={themeCssVariables(themeColors)} data-theme={result.config.theme}>
      <div className="share-left">
        <strong>{formatElapsed(result.elapsedMs)}</strong>
        <span>
          {labelForMode(result.config.mode)}<br />
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

function labelForMode(mode: TestResult["config"]["mode"]): string {
  if (mode === "target-match") return "Target Match";
  if (mode === "coding") return "Python Coding";
  return "Drill";
}
