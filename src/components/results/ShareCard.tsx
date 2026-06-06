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
  const cleanRun = result.hintsUsed === 0 && result.mouseActions === 0 && result.clipboardActions === 0;
  const resultLabel = cleanRun ? "clean keyboard run" : "completed run";

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
        <p>{resultLabel}</p>
        <div className="share-metrics" aria-label="run stats">
          <div className="share-stat">
            <strong>{result.editsPerMinute}</strong>
            <span>epm</span>
          </div>
          <div className="share-stat">
            <strong>{result.totalKeystrokes}</strong>
            <span>keys</span>
          </div>
          <div className="share-stat">
            <strong>{result.estimatedCorrectionCount}</strong>
            <span>fixes</span>
          </div>
        </div>
        <small>{result.hintsUsed} hints, {result.mouseActions} mouse actions, {result.clipboardActions} clipboard actions</small>
      </div>
    </div>
  );
});

function labelForMode(mode: TestResult["config"]["mode"]): string {
  if (mode === "target-match") return "Target Match";
  if (mode === "coding") return "Python Coding";
  return "Drill";
}
