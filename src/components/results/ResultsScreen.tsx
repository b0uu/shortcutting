"use client";

import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { formatElapsed } from "@/domain/timer";
import { themeCssVariables } from "@/domain/themes";
import type { EditEvent, Platform, PracticeSuggestion, SkillTag, TestResult, ThemeColors } from "@/domain/types";
import { ShortcutHint } from "@/components/ui/ShortcutHint";
import { ShareCard } from "./ShareCard";

type ResultsScreenProps = {
  result: TestResult;
  themeColors: ThemeColors;
  onPlayAgain: () => void;
  onPracticeAgain?: (suggestion: PracticeSuggestion) => void;
  accountConnected?: boolean;
  accountHref?: string;
};

export function ResultsScreen({ result, themeColors, onPlayAgain, onPracticeAgain, accountConnected = false, accountHref }: ResultsScreenProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const tabAnimationTimeout = useRef<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareImage, setShareImage] = useState<{ url: string; blob: Blob | null } | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [tabCoachVisible, setTabCoachVisible] = useState(true);
  const modifier = result.config.platform === "mac" ? "⌥" : "alt";

  const replayKeys = useMemo(() => replayKeysForResult(result), [result]);

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

  const renderShareCanvas = useCallback(async () => {
    if (!shareRef.current) return;
    return html2canvas(shareRef.current, {
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
  }, [themeColors]);

  const prepareShareCard = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      const canvas = await renderShareCanvas();
      if (!canvas) return null;
      const image = {
        url: canvas.toDataURL("image/png"),
        blob: await canvasToBlob(canvas),
      };
      setShareImage(image);
      return image;
    } catch {
      setExportError("Share card export failed. Try again.");
      return null;
    } finally {
      setExporting(false);
    }
  }, [renderShareCanvas]);

  const openShareCard = useCallback(() => {
    setShareDialogOpen(true);
    if (!shareImage && !exporting) void prepareShareCard();
  }, [exporting, prepareShareCard, shareImage]);

  const downloadShareImage = useCallback(async () => {
    const image = shareImage ?? await prepareShareCard();
    if (!image) return;
    const link = document.createElement("a");
    link.download = "shortcutting-result.png";
    link.href = image.url;
    link.click();
  }, [prepareShareCard, shareImage]);

  const copyShareImage = useCallback(async () => {
    const image = shareImage ?? await prepareShareCard();
    if (!image?.blob) {
      setExportError("Copy image is not available in this browser. Try download.");
      return;
    }
    setCopying(true);
    setExportError(null);
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image.blob })]);
    } catch {
      setExportError("Copy image failed. Try download.");
    } finally {
      setCopying(false);
    }
  }, [prepareShareCard, shareImage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (document.querySelector("[aria-modal='true']")) return;
      if (!isAltShortcut(event)) return;
      const key = event.key.toLowerCase();
      if (key === "d") {
        event.preventDefault();
        openShareCard();
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
  }, [onPracticeAgain, openShareCard, requestPlayAgain, result.nextPracticeSuggestion]);

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
          <p>total time: {result.config.challengeCount}-part challenge</p>
          <h1 id="results-heading">{formatElapsed(result.elapsedMs)}</h1>
          {result.isPersonalBest && <span className="pb-badge">new personal best</span>}
        </div>
        <KeystrokePlayback keys={replayKeys} platform={result.config.platform} />
      </div>
      <div className="results-grid" aria-label="result stats">
        <Stat value={result.editsPerMinute} label="edits / min" />
        <Stat value={result.totalKeystrokes} label="keystrokes" />
        <Stat value={result.estimatedCorrectionCount} label="corrections" />
        <Stat value={result.hintsUsed} label="hints" />
      </div>
      <div className="results-insights" aria-label="skill summary">
        <span>{result.estimatedCorrectionCount} estimated corrections</span>
        <span>best: {formatSkill(result.bestSkillCategory?.tag)}</span>
        <span>slowest: {formatSkill(result.slowestSkillCategory?.tag)}</span>
        <span>hint focus: {formatTopSkill(result.hintSkillSummary)}</span>
      </div>
      <ShareCard ref={shareRef} result={result} themeColors={themeColors} />
      <motion.div className="results-actions" layout>
        <AnimatePresence>
          {tabCoachVisible && (
          <motion.div
            className="results-tab-coach"
            data-testid="results-tab-coach"
            aria-live="polite"
            layout
            initial={{ opacity: 0, x: -8, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>press</span>
            <kbd>tab</kbd>
          </motion.div>
          )}
        </AnimatePresence>
        <motion.button layout type="button" className="btn-primary" onClick={openShareCard} disabled={exporting} aria-busy={exporting}>
          <span>{exporting ? "rendering" : "share card"}</span>
          <ShortcutHint keys={[modifier, "D"]} />
        </motion.button>
        <motion.button layout type="button" className="btn-ghost" onClick={requestPlayAgain}>
          <span>play again</span>
          <ShortcutHint keys={[modifier, "P"]} />
        </motion.button>
        {onPracticeAgain && (
          <motion.button layout type="button" className="btn-ghost" onClick={() => onPracticeAgain(result.nextPracticeSuggestion)}>
            <span>practice this again</span>
            <ShortcutHint keys={[modifier, "G"]} />
          </motion.button>
        )}
        {!accountConnected && accountHref && (
          <Link href={accountHref} className="btn-ghost results-link-action">
            <span>save stats</span>
          </Link>
        )}
      </motion.div>
      <p className="export-status" aria-live="polite">{exportError}</p>
      <ShareCardDialog
        open={shareDialogOpen}
        exporting={exporting}
        copying={copying}
        error={exportError}
        image={shareImage}
        onClose={() => setShareDialogOpen(false)}
        onCopy={copyShareImage}
        onDownload={downloadShareImage}
      />
    </motion.section>
  );
}

function ShareCardDialog({
  open,
  exporting,
  copying,
  error,
  image,
  onClose,
  onCopy,
  onDownload,
}: {
  open: boolean;
  exporting: boolean;
  copying: boolean;
  error: string | null;
  image: { url: string; blob: Blob | null } | null;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="settings-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="settings-card share-card-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Share card"
            tabIndex={-1}
            initial={{ y: 6 }}
            animate={{ y: 0 }}
            exit={{ y: 8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
            }}
          >
            <div className="panel-heading">
              <h2>share card</h2>
              <button type="button" className="btn-ghost" onClick={onClose}>close</button>
            </div>
            <div className="share-preview-panel" aria-label="share card preview">
              <div className="share-preview-image">
                {image ? (
                  <Image src={image.url} alt="Generated share card screenshot" width={640} height={320} unoptimized />
                ) : (
                  <div className="share-preview-loading">rendering preview</div>
                )}
              </div>
              <div className="share-preview-actions">
                <button type="button" className="btn-ghost" onClick={onCopy} disabled={!image || copying || exporting} aria-busy={copying}>
                  {copying ? "copying" : "copy image"}
                </button>
                <button type="button" className="btn-ghost" onClick={onDownload} disabled={!image || exporting}>
                  download
                </button>
              </div>
            </div>
            <p className="export-status" aria-live="polite">{error}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

const playbackRows = [
  ["esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "backspace"],
  ["tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "enter"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "shift"],
  ["ctrl", "option", "cmd", "space", "cmd", "option", "left", "right", "home", "end", "delete"],
];

function KeystrokePlayback({ keys, platform }: { keys: string[]; platform: Platform }) {
  const normalizedKeys = keys.length > 0 ? keys : ["tab", "enter"];
  const uniqueKeys = new Map<string, number>();
  normalizedKeys.forEach((key, index) => {
    if (!uniqueKeys.has(key)) uniqueKeys.set(key, index);
  });
  const tickerText = [...normalizedKeys, ...normalizedKeys].map((key) => displayPlaybackKey(key, platform)).join(" ");
  const loopDuration = Math.max(14, Math.min(24, normalizedKeys.length * 1.05));

  return (
    <div
      className="results-keystroke-panel"
      aria-label="keystroke replay"
      style={{ "--playback-duration": `${loopDuration}s` } as CSSProperties}
    >
      <div className="results-playback-keyboard" aria-label="simulated keyboard">
        {playbackRows.map((row, rowIndex) => (
          <div className="keyboard-row" key={`playback-row-${rowIndex}`}>
            {row.map((key, keyIndex) => {
              const delayIndex = uniqueKeys.get(key);
              const isLit = delayIndex !== undefined;
              return (
                <span
                  key={`${key}-${keyIndex}`}
                  className={`${isLit ? "lit" : ""} key-${key}`}
                  style={isLit ? { "--pulse-delay": `${delayIndex * 0.24}s` } as CSSProperties : undefined}
                >
                  {displayPlaybackKey(key, platform)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="keystroke-ticker" aria-hidden="true">
        <span>{tickerText}</span>
      </div>
    </div>
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

function replayKeysForResult(result: TestResult): string[] {
  const keyEvents = (result.editEvents ?? [])
    .filter((event): event is EditEvent & { key: string } => event.type === "keydown" && typeof event.key === "string")
    .map((event) => normalizePlaybackKey(event.key))
    .filter((key) => key !== null);

  if (keyEvents.length > 0) return keyEvents.slice(0, 32);

  return result.challengeResults
    .flatMap((challenge) => Array.from(challenge.finalText))
    .map((key) => normalizePlaybackKey(key))
    .filter((key): key is string => key !== null)
    .slice(0, 32);
}

function normalizePlaybackKey(key: string): string | null {
  if (key.length === 1) return key === " " ? "space" : key.toLowerCase();
  const normalized = key.toLowerCase();
  if (normalized === "control") return "ctrl";
  if (normalized === "meta") return "cmd";
  if (normalized === "arrowleft") return "left";
  if (normalized === "arrowright") return "right";
  if (normalized === "backspace") return "backspace";
  if (normalized === "delete") return "delete";
  if (normalized === "enter") return "enter";
  if (normalized === "tab") return "tab";
  if (normalized === "shift") return "shift";
  if (normalized === "alt") return "option";
  if (normalized === "home") return "home";
  if (normalized === "end") return "end";
  return null;
}

function displayPlaybackKey(key: string, platform: Platform): string {
  if (key === "backspace") return "⌫";
  if (key === "enter") return "↵";
  if (key === "tab") return "⇥";
  if (key === "caps") return "⇪";
  if (key === "shift") return "⇧";
  if (key === "left") return "←";
  if (key === "right") return "→";
  if (key === "delete") return "⌦";
  if (key === "space") return "·";
  if (platform === "mac") {
    if (key === "cmd") return "⌘";
    if (key === "option") return "⌥";
    if (key === "ctrl") return "⌃";
  }
  if (key === "cmd") return "◆";
  if (key === "option") return "⌥";
  if (key === "ctrl") return "⌃";
  return key;
}
