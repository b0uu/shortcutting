import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { formatElapsed } from "@/domain/timer";
import { colorsForTheme } from "@/domain/themes";
import type { Difficulty, Mode, TestResult } from "@/domain/types";
import type { ResultLogger } from "@/storage/resultLogger";
import { ShareCard } from "@/components/results/ShareCard";

type HistoryPanelProps = {
  open: boolean;
  logger: ResultLogger;
  onClose: () => void;
};

type FilterMode = Mode | "all";
type FilterDifficulty = Difficulty | "all";

export function HistoryPanel({ open, logger, onClose }: HistoryPanelProps) {
  const [mode, setMode] = useState<FilterMode>("all");
  const [difficulty, setDifficulty] = useState<FilterDifficulty>("all");
  const [results, setResults] = useState<TestResult[]>([]);
  const [personalBestCount, setPersonalBestCount] = useState(0);
  const [personalBests, setPersonalBests] = useState<TestResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sharePreviewVisible, setSharePreviewVisible] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);
  const selected = useMemo(() => results.find((result) => result.id === selectedId) ?? results[0] ?? null, [results, selectedId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadHistory() {
      const [history, bests] = await Promise.all([
        logger.getHistory({ mode, difficulty }),
        logger.getPersonalBests(),
      ]);
      if (cancelled) return;
      const bestRows = Object.values(bests).sort((first, second) => first.elapsedMs - second.elapsedMs);
      setResults(history);
      setPersonalBestCount(bestRows.length);
      setPersonalBests(bestRows);
      setSelectedId((current) => history.some((result) => result.id === current) ? current : history[0]?.id ?? null);
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [difficulty, logger, mode, open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  async function clearHistory() {
    if (!clearArmed) {
      setClearArmed(true);
      return;
    }
    await logger.clearLocalResults();
    setResults([]);
    setPersonalBests([]);
    setSelectedId(null);
    setPersonalBestCount(0);
    setClearArmed(false);
  }

  return (
    <motion.div
      className="settings-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        className="settings-card history-card"
        role="dialog"
        aria-modal="true"
        aria-label="History"
        tabIndex={-1}
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="panel-heading">
          <h2>history</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>close</button>
        </div>
        <div className="history-filters" aria-label="history filters">
          <FilterButton active={mode === "all"} onClick={() => { setClearArmed(false); setMode("all"); }}>all modes</FilterButton>
          <FilterButton active={mode === "target-match"} onClick={() => { setClearArmed(false); setMode("target-match"); }}>target</FilterButton>
          <FilterButton active={mode === "drill"} onClick={() => { setClearArmed(false); setMode("drill"); }}>drill</FilterButton>
          <FilterButton active={mode === "coding"} onClick={() => { setClearArmed(false); setMode("coding"); }}>coding</FilterButton>
          <FilterButton active={difficulty === "all"} onClick={() => { setClearArmed(false); setDifficulty("all"); }}>all difficulties</FilterButton>
          <FilterButton active={difficulty === "standard"} onClick={() => { setClearArmed(false); setDifficulty("standard"); }}>standard</FilterButton>
          <FilterButton active={difficulty === "advanced"} onClick={() => { setClearArmed(false); setDifficulty("advanced"); }}>advanced</FilterButton>
          <FilterButton active={difficulty === "multiline"} onClick={() => { setClearArmed(false); setDifficulty("multiline"); }}>multi-line</FilterButton>
        </div>
        <p className="history-meta">{results.length} recent runs: {personalBestCount} personal bests</p>
        <div className="history-bests" aria-label="personal bests">
          <span>personal bests</span>
          {personalBests.length === 0 ? (
            <em>none yet</em>
          ) : personalBests.slice(0, 4).map((best) => (
            <button
              key={best.id}
              type="button"
              className="history-best-chip"
              onClick={() => setSelectedId(best.id)}
            >
              <strong>{formatElapsed(best.elapsedMs)}</strong>
              <span>{labelForMode(best.config.mode)}: {best.config.difficulty}</span>
            </button>
          ))}
        </div>
        <div className="history-layout">
          <div className="history-list" aria-label="recent runs">
            {results.length === 0 ? (
              <p className="empty-state">no local runs yet</p>
            ) : results.map((result) => (
              <button
                key={result.id}
                type="button"
                className={`history-row ${selected?.id === result.id ? "active" : ""}`}
                onClick={() => setSelectedId(result.id)}
              >
                <strong>{formatElapsed(result.elapsedMs)}</strong>
                <span>{labelForMode(result.config.mode)}: {result.config.difficulty}: {new Date(result.completedAt).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
          <div className="history-detail" aria-label="run detail">
            {selected ? (
              <>
                <strong>{formatElapsed(selected.elapsedMs)}</strong>
                <span>{labelForMode(selected.config.mode)}: {selected.config.challengeCount} parts: {selected.config.platform}: {selected.config.mousePolicy}</span>
                <span>{selected.totalKeystrokes} keys: {selected.hintsUsed} hints: {selected.editsPerMinute} edits/min</span>
                <pre>{selected.challengeResults.map((result) => result.finalText).join("\n")}</pre>
                <button type="button" className="btn-ghost history-share-action" onClick={() => setSharePreviewVisible((visible) => !visible)}>
                  {sharePreviewVisible ? "hide share card" : "show share card"}
                </button>
                {sharePreviewVisible && (
                  <div className="history-share-preview">
                    <ShareCard
                      result={selected}
                      themeColors={colorsForTheme(selected.config.theme, selected.config.customTheme)}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="empty-state">complete a run to see details</p>
            )}
          </div>
        </div>
        <button type="button" className="btn-ghost danger-action" onClick={clearHistory}>
          {clearArmed ? "confirm clear history" : "clear history"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`opt-btn ${active ? "active" : ""}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

function labelForMode(mode: Mode): string {
  if (mode === "target-match") return "target match";
  if (mode === "coding") return "coding";
  return "drill";
}
