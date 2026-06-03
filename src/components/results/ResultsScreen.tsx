"use client";

import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatElapsed } from "@/domain/timer";
import { themeCssVariables } from "@/domain/themes";
import type { PracticeSuggestion, SkillTag, TestResult, ThemeColors } from "@/domain/types";
import { ShortcutHint } from "@/components/ui/ShortcutHint";
import { ShareCard } from "./ShareCard";

type ResultsScreenProps = {
  result: TestResult;
  themeColors: ThemeColors;
  onPlayAgain: () => void;
  onPracticeAgain?: (suggestion: PracticeSuggestion) => void;
};

export function ResultsScreen({ result, themeColors, onPlayAgain, onPracticeAgain }: ResultsScreenProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const tabAnimationTimeout = useRef<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [tabCoachVisible, setTabCoachVisible] = useState(true);
  const modifier = result.config.platform === "mac" ? "⌥" : "alt";

  useEffect(() => {
    sectionRef.current?.focus();
  }, []);

  useEffect(() => {
    const cleanupSection = sectionRef.current;

    function handleTabNavigation(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const section = sectionRef.current;
      setTabCoachVisible(false);
      if (!section) return;

      section.classList.remove("tab-shifting");
      document.documentElement.classList.remove("tab-shifting");
      void section.offsetWidth;
      section.classList.add("tab-shifting");
      document.documentElement.classList.add("tab-shifting");
      if (tabAnimationTimeout.current) window.clearTimeout(tabAnimationTimeout.current);
      tabAnimationTimeout.current = window.setTimeout(() => {
        section.classList.remove("tab-shifting");
        document.documentElement.classList.remove("tab-shifting");
        tabAnimationTimeout.current = null;
      }, 420);
    }

    window.addEventListener("keydown", handleTabNavigation);
    return () => {
      window.removeEventListener("keydown", handleTabNavigation);
      cleanupSection?.classList.remove("tab-shifting");
      document.documentElement.classList.remove("tab-shifting");
      if (tabAnimationTimeout.current) window.clearTimeout(tabAnimationTimeout.current);
    };
  }, []);

  const requestPlayAgain = useCallback(() => {
    onPlayAgain();
  }, [onPlayAgain]);

  const downloadCard = useCallback(async () => {
    if (!shareRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: themeColors.background,
        scale: 2,
        width: 640,
        height: 320,
        onclone: (doc) => {
          const card = doc.querySelector<HTMLElement>(".share-card");
          if (!card) return;
          card.classList.add("share-card-export");
          for (const [key, value] of Object.entries(themeCssVariables(themeColors))) {
            card.style.setProperty(key, value);
          }
        },
      });
      const link = document.createElement("a");
      link.download = "shortcutting-result.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setExportError("Share card export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }, [themeColors]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (document.querySelector("[aria-modal='true']")) return;
      if (!isAltShortcut(event)) return;
      const key = event.key.toLowerCase();
      if (key === "d") {
        event.preventDefault();
        void downloadCard();
      } else if (key === "p") {
        event.preventDefault();
        requestPlayAgain();
      } else if (key === "g" && onPracticeAgain) {
        event.preventDefault();
        onPracticeAgain(result.nextPracticeSuggestion);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [downloadCard, onPracticeAgain, requestPlayAgain, result.nextPracticeSuggestion]);

  return (
    <motion.section
      ref={sectionRef}
      className="results-view"
      tabIndex={-1}
      aria-labelledby="results-heading"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="results-top">
        <div className="results-hero">
          <div className="results-tab-slot">
            {tabCoachVisible && (
              <div className="results-tab-coach" data-testid="results-tab-coach" aria-live="polite">
                <span>press</span>
                <kbd>tab</kbd>
              </div>
            )}
          </div>
          <p>total time: {result.config.challengeCount}-part challenge</p>
          <h1 id="results-heading">{formatElapsed(result.elapsedMs)}</h1>
          {result.isPersonalBest && <span className="pb-badge">new personal best</span>}
        </div>
        <div className="results-grid">
          <Stat value={result.totalKeystrokes} label="keystrokes" />
          <Stat value={result.hintsUsed} label="hints used" />
          <Stat value={result.mouseActions} label="mouse actions" />
          <Stat value={result.clipboardActions} label="clipboard" />
          <Stat value={result.undoCount + result.redoCount} label="undo / redo" />
          <Stat value={result.editsPerMinute} label="edits / min" />
        </div>
      </div>
      <div className="results-insights" aria-label="skill summary">
        <span>{result.estimatedCorrectionCount} estimated corrections</span>
        <span>best: {formatSkill(result.bestSkillCategory?.tag)}</span>
        <span>slowest: {formatSkill(result.slowestSkillCategory?.tag)}</span>
        <span>hint focus: {formatTopSkill(result.hintSkillSummary)}</span>
      </div>
      <div className="practice-card" aria-label="next practice suggestion">
        <div>
          <span>next practice</span>
          <strong>{result.nextPracticeSuggestion.label}</strong>
          <p>{result.nextPracticeSuggestion.rationale}</p>
        </div>
      </div>
      <ShareCard ref={shareRef} result={result} themeColors={themeColors} />
      <div className="results-actions">
        <button type="button" className="btn-primary" onClick={downloadCard} disabled={exporting} aria-busy={exporting}>
          <span>{exporting ? "exporting" : "download card"}</span>
          <ShortcutHint keys={[modifier, "D"]} />
        </button>
        <button type="button" className="btn-ghost" onClick={requestPlayAgain}>
          <span>play again</span>
          <ShortcutHint keys={[modifier, "P"]} />
        </button>
        {onPracticeAgain && (
          <button type="button" className="btn-ghost" onClick={() => onPracticeAgain(result.nextPracticeSuggestion)}>
            <span>practice this again</span>
            <ShortcutHint keys={[modifier, "G"]} />
          </button>
        )}
      </div>
      <p className="export-status" aria-live="polite">{exportError}</p>
    </motion.section>
  );
}

function isAltShortcut(event: KeyboardEvent): boolean {
  return event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </motion.div>
  );
}

function formatSkill(tag: string | undefined): string {
  return tag ? tag.replaceAll("-", " ") : "none yet";
}

function formatTopSkill(summary: Partial<Record<SkillTag, number>> | undefined): string {
  if (!summary) return "none yet";
  const entries = Object.entries(summary) as Array<[SkillTag, number]>;
  if (entries.length === 0) return "none yet";
  const [tag, count] = entries.reduce((best, current) => (current[1] > best[1] ? current : best));
  return `${formatSkill(tag)} (${count})`;
}
