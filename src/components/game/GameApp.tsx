"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { generateTargetChallenges, seedPack } from "@/domain/challenges";
import { generatePythonChallenges } from "@/domain/coding";
import { generateDrillChallenges } from "@/domain/drills";
import { changedTargetCharacterIndexes } from "@/domain/diff";
import { createEditEvent } from "@/domain/events";
import { detectPlatform, resolvePlatform } from "@/domain/platform";
import { personalBestKey, summarizeResult } from "@/domain/results";
import { colorsForTheme, darkThemeColors, themeCssVariables } from "@/domain/themes";
import {
  completeActiveSegment,
  createSegments,
  updateActiveSegmentText,
  type ChallengeSegment,
} from "@/domain/segments";
import { formatElapsed } from "@/domain/timer";
import { validateChallenge } from "@/domain/validation";
import type {
  Challenge,
  ChallengeResult,
  EditEvent,
  Mode,
  PracticeSuggestion,
  SelectionState,
  TestConfig,
  TestResult,
} from "@/domain/types";
import { LocalResultLogger } from "@/storage/localResultLogger";
import { loadSettings, saveSettings } from "@/storage/settingsStore";
import { Header } from "@/components/layout/Header";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { ShortcutMapPanel } from "@/components/shortcuts/ShortcutMapPanel";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ResultsScreen } from "@/components/results/ResultsScreen";
import { ShortcutHint } from "@/components/ui/ShortcutHint";
import { EditableSurface } from "./EditableSurface";
import { ModeBar } from "./ModeBar";
import { ProgressPips } from "./ProgressPips";

type Phase = "pre-test" | "active" | "complete";

type ChallengeStats = {
  hintsUsed: number;
  mouseActions: number;
  keystrokes: number;
  clipboardActions: number;
  undoCount: number;
  redoCount: number;
};

const defaultStats: ChallengeStats = {
  hintsUsed: 0,
  mouseActions: 0,
  keystrokes: 0,
  clipboardActions: 0,
  undoCount: 0,
  redoCount: 0,
};

const defaultConfig: TestConfig = {
  mode: "target-match",
  challengeCount: 3,
  platformPreference: "auto",
  platform: "windows-linux",
  mousePolicy: "keyboard-only",
  difficulty: "standard",
  soundEnabled: true,
  theme: "dark",
  customTheme: darkThemeColors,
  codingLanguage: "python",
  smartPairs: true,
  reducedMotion: false,
  seedPack,
  practiceSkillPack: null,
};

export function GameApp() {
  const logger = useMemo(() => new LocalResultLogger(), []);
  const [config, setConfig] = useState<TestConfig>(defaultConfig);
  const [phase, setPhase] = useState<Phase>("pre-test");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challenges, setChallenges] = useState(() => buildChallenges(defaultConfig));
  const [segments, setSegments] = useState<ChallengeSegment[]>(() => createSegments(challenges));
  const [selection, setSelection] = useState<SelectionState>(() => initialSelection(challenges[0]));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutMapOpen, setShortcutMapOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [now, setNow] = useState(0);
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [challengeStartTime, setChallengeStartTime] = useState<number | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [flowMatched, setFlowMatched] = useState(false);
  const [completedPulseIndex, setCompletedPulseIndex] = useState<number | null>(null);
  const [partTransition, setPartTransition] = useState<{ completedIndex: number; activeIndex: number } | null>(null);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [screenFading, setScreenFading] = useState(false);
  const screenFadeTimeout = useRef<number | null>(null);

  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const runStartedAtIso = useRef<string | null>(null);
  const challengeResults = useRef<ChallengeResult[]>([]);
  const editEvents = useRef<EditEvent[]>([]);
  const stats = useRef<ChallengeStats>({ ...defaultStats });
  const hintTimeout = useRef<number | null>(null);
  const completionFlashTimeout = useRef<number | null>(null);
  const lockedStackInnerRef = useRef<HTMLDivElement | null>(null);
  const editorFlowRef = useRef<HTMLDivElement | null>(null);
  const completing = useRef(false);
  const latestText = useRef(challenges[0].editableText);
  const latestSelection = useRef(selection);
  const maybeCompleteRef = useRef<(text: string, selection: SelectionState) => void>(() => {});

  const challenge = segments[challengeIndex]?.challenge ?? challenges[0];
  const currentText = segments[challengeIndex]?.text ?? challenge.editableText;
  const challengeInitialSelection = useMemo(() => initialSelection(challenge), [challenge]);
  const midChallenge = phase === "active";
  const active = phase !== "complete";
  const visibleElapsed = result?.elapsedMs ?? (runStartTime === null ? 0 : now - runStartTime);
  const activeThemeColors = useMemo(() => colorsForTheme(config.theme, config.customTheme), [config.customTheme, config.theme]);
  const activeThemeStyle = useMemo(() => themeCssVariables(activeThemeColors) as CSSProperties, [activeThemeColors]);
  // Native caret is an intentional MVP fallback until custom mid-text cursor rendering is robust.
  const nativeCaretFallback = true;

  useEffect(() => {
    const detected = detectPlatform(navigator.userAgent, navigator.platform);
    const merged = loadSettings(defaultConfig, detected);
    const liveConfig = withFreshSeed(merged);
    // Local settings must hydrate once from localStorage before the user starts a run.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(liveConfig);
    resetPreview(liveConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = "shortcutting";
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = config.theme;
    const variables = themeCssVariables(activeThemeColors);
    for (const [key, value] of Object.entries(variables)) {
      document.documentElement.style.setProperty(key, value);
    }
    return () => {
      delete document.documentElement.dataset.theme;
      for (const key of Object.keys(variables)) {
        document.documentElement.style.removeProperty(key);
      }
    };
  }, [activeThemeColors, config.theme]);

  useEffect(() => {
    latestText.current = currentText;
  }, [currentText]);

  useEffect(() => {
    latestSelection.current = selection;
  }, [selection]);

  useEffect(() => {
    maybeCompleteRef.current = maybeComplete;
  });

  useLayoutEffect(() => {
    if (!flowMatched || !lockedStackInnerRef.current || !editorFlowRef.current) return;
    if (config.mode === "drill") {
      editorFlowRef.current.style.setProperty("--completion-rail-height", "40px");
      return;
    }
    const visibleHistoryHeight = Math.min(64, lockedStackInnerRef.current.getBoundingClientRect().height);
    editorFlowRef.current.style.setProperty("--completion-rail-height", `${Math.max(28, Math.round(visibleHistoryHeight) + 28)}px`);
  }, [config.mode, flowMatched, segments]);

  useEffect(() => {
    if (runStartTime === null || phase === "complete") return;
    const interval = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(interval);
  }, [runStartTime, phase]);

  useEffect(() => () => {
    clearScheduledWork();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shortcutMapOpen && event.key === "Escape") {
        closeShortcutMap();
        return;
      }

      if (historyOpen && event.key === "Escape") {
        closeHistory();
        return;
      }

      if (settingsOpen && event.key === "Escape") {
        closeSettings();
        return;
      }

      if (event.key === "Escape" && !midChallenge) {
        openSettings();
        return;
      }

      if (!settingsOpen && config.mode === "drill" && phase !== "complete" && isAltShortcut(event) && event.key.toLowerCase() === "r") {
        event.preventDefault();
        resetCurrentDrill();
        return;
      }

      if (settingsOpen || midChallenge || phase !== "pre-test" || !isAltShortcut(event)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "1") {
        event.preventDefault();
        changeMode("target-match");
      } else if (key === "2") {
        event.preventDefault();
        changeMode("drill");
      } else if (key === "3") {
        event.preventDefault();
        changeMode("coding");
      } else if (key === "h") {
        event.preventDefault();
        goHome();
      } else if (key === "y") {
        event.preventDefault();
        openHistory();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOpen, settingsOpen, shortcutMapOpen, phase, midChallenge, config.mode]);

  const resetPreview = useCallback((nextConfig: TestConfig) => {
    clearScheduledWork();
    const nextChallenges = buildChallenges(nextConfig);
    setChallenges(nextChallenges);
    setSegments(createSegments(nextChallenges));
    setChallengeIndex(0);
    setSelection(initialSelection(nextChallenges[0]));
    setPhase("pre-test");
    setShowHint(false);
    setRunStartTime(null);
    setChallengeStartTime(null);
    setResult(null);
    setFlowMatched(false);
    setCompletedPulseIndex(null);
    setPartTransition(null);
    editorFlowRef.current?.style.setProperty("--completion-rail-height", "28px");
    setEditorResetKey((key) => key + 1);
    runStartedAtIso.current = null;
    challengeResults.current = [];
    editEvents.current = [];
    stats.current = { ...defaultStats };
    completing.current = false;
  }, []);

  function updateConfig(patch: Partial<TestConfig>) {
    const detected = detectPlatform(navigator.userAgent, navigator.platform);
    const nextPreference = patch.platformPreference ?? config.platformPreference;
    const shouldClearPracticeFocus = patch.practiceSkillPack === undefined
      && (
        patch.mode !== undefined
        || patch.difficulty !== undefined
        || patch.challengeCount !== undefined
        || patch.seedPack !== undefined
      );
    const shouldFreshenSeed = patch.seedPack === undefined
      && patch.practiceSkillPack === undefined
      && (patch.mode !== undefined || patch.difficulty !== undefined || patch.challengeCount !== undefined);
    const nextConfig = {
      ...config,
      ...patch,
      platform: resolvePlatform(nextPreference, detected),
      practiceSkillPack: shouldClearPracticeFocus ? null : (patch.practiceSkillPack ?? config.practiceSkillPack ?? null),
      seedPack: patch.seedPack ?? (shouldFreshenSeed ? freshSeedPack() : config.seedPack),
    };
    setConfig(nextConfig);
    saveSettings(nextConfig);
    resetPreview(nextConfig);
  }

  function changeMode(mode: Mode) {
    updateConfig({ mode });
  }

  function goHome() {
    closeSettings();
    closeHistory();
    closeShortcutMap();
    resetWithFreshSeed();
  }

  function giveUp() {
    resetWithFreshSeed();
  }

  function startRunFromEditorInput() {
    if (phaseRef.current !== "pre-test") return;
    const start = performance.now();
    if (runStartTime === null) {
      setRunStartTime(start);
      setNow(start);
      runStartedAtIso.current = new Date().toISOString();
    }
    setChallengeStartTime(start);
    stats.current = { ...defaultStats };
    setShowHint(false);
    setPhase("active");
    phaseRef.current = "active";
    scheduleHint();
  }

  function scheduleHint() {
    if (hintTimeout.current) window.clearTimeout(hintTimeout.current);
    hintTimeout.current = window.setTimeout(() => {
      if (phaseRef.current !== "active") return;
      setShowHint(true);
      stats.current.hintsUsed += 1;
      editEvents.current.push(createEditEvent("hint", currentChallengeRef.current.id, performance.now()));
    }, 5000);
  }

  const phaseRef = useRef(phase);
  const currentChallengeRef = useRef(challenge);
  useEffect(() => {
    phaseRef.current = phase;
    currentChallengeRef.current = challenge;
  }, [phase, challenge]);

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!active) return;
    if (phaseRef.current === "pre-test" && !isRunStartingEditorKey(event)) return;
    startRunFromEditorInput();
    hideHintImmediately();
    scheduleHint();

    if (!isModifierKey(event.key)) {
      stats.current.keystrokes += 1;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) {
      stats.current.redoCount += 1;
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      stats.current.undoCount += 1;
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
      stats.current.redoCount += 1;
    }

    editEvents.current.push(createEditEvent("keydown", challenge.id, performance.now(), {
      key: event.key,
      code: event.code,
      modifiers: {
        meta: event.metaKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
      },
      textBefore: latestText.current,
      selectionBefore: latestSelection.current,
    }));
  }

  function handleInputText(text: string, nextSelection: SelectionState) {
    startRunFromEditorInput();
    setSegments((currentSegments) => updateActiveSegmentText(currentSegments, text));
    setSelection(nextSelection);
    if (phaseRef.current === "active") {
      editEvents.current.push(createEditEvent("input", challenge.id, performance.now(), {
        textAfter: text,
        selectionAfter: nextSelection,
      }));
      maybeComplete(text, nextSelection);
    }
  }

  const handleSelection = useCallback((nextSelection: SelectionState) => {
    setSelection(nextSelection);
    if (phaseRef.current === "active") {
      editEvents.current.push(createEditEvent("selectionchange", currentChallengeRef.current.id, performance.now(), {
        selectionAfter: nextSelection,
      }));
      maybeCompleteRef.current(latestText.current, nextSelection);
    }
  }, []);

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (phaseRef.current !== "active") return;
    if (config.mousePolicy === "keyboard-only" && runStartTime !== null) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    stats.current.mouseActions += 1;
    editEvents.current.push(createEditEvent("mouse", challenge.id, performance.now(), {
      textBefore: latestText.current,
      selectionBefore: latestSelection.current,
    }));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== "active") return;
    if (config.mousePolicy !== "keyboard-only" || runStartTime === null) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleClipboard(type: "copy" | "cut" | "paste") {
    if (!active) return;
    if (phaseRef.current === "pre-test" && type !== "copy") startRunFromEditorInput();
    if (phaseRef.current !== "active") return;
    stats.current.clipboardActions += 1;
    editEvents.current.push(createEditEvent("clipboard", challenge.id, performance.now(), {
      key: type,
      textBefore: latestText.current,
      selectionBefore: latestSelection.current,
    }));
  }

  function resetCurrentDrill() {
    if (config.mode !== "drill" || phaseRef.current === "complete") return;
    const resetSelection = initialSelection(currentChallengeRef.current);
    const resetText = currentChallengeRef.current.editableText;
    if (hintTimeout.current) window.clearTimeout(hintTimeout.current);
    setSegments((currentSegments) => updateActiveSegmentText(currentSegments, resetText));
    setSelection(resetSelection);
    setShowHint(false);
    setEditorResetKey((key) => key + 1);
    editEvents.current.push(createEditEvent("input", currentChallengeRef.current.id, performance.now(), {
      key: "reset-drill",
      textAfter: resetText,
      selectionAfter: resetSelection,
    }));
    if (phaseRef.current === "active") scheduleHint();
  }

  function maybeComplete(text: string, nextSelection: SelectionState) {
    if (completing.current || phaseRef.current !== "active") return;
    if (!validateChallenge(currentChallengeRef.current, text, nextSelection)) return;
    completing.current = true;
    completeChallenge(text);
  }

  function completeChallenge(finalText: string) {
    if (hintTimeout.current) window.clearTimeout(hintTimeout.current);
    const completedAt = performance.now();
    const startedAt = challengeStartTime ?? completedAt;
    const challengeResult: ChallengeResult = {
      challengeId: challenge.id,
      mode: challenge.mode,
      beforeText: challenge.editableText,
      targetText: challenge.targetText,
      finalText,
      elapsedMs: completedAt - startedAt,
      skillTags: Array.from(new Set(challenge.errors.flatMap((error) => error.skillTags))),
      skillPacks: challenge.skillPacks,
      estimatedCorrections: challenge.estimatedCorrections,
      ...stats.current,
    };
    challengeResults.current = [...challengeResults.current, challengeResult];
    playCompleteSound(config.soundEnabled);
    const transition = completeActiveSegment(segments, finalText);
    setSegments(transition.segments);

    if (transition.complete) {
      finalizeRun(completedAt);
      return;
    }

    setFlowMatched(true);
    setCompletedPulseIndex(challengeIndex);
    setPartTransition({ completedIndex: challengeIndex, activeIndex: transition.activeIndex });
    if (completionFlashTimeout.current) window.clearTimeout(completionFlashTimeout.current);
    completionFlashTimeout.current = window.setTimeout(() => {
      setFlowMatched(false);
      setCompletedPulseIndex(null);
      setPartTransition(null);
      completionFlashTimeout.current = null;
    }, 1400);

    const nextChallenge = transition.segments[transition.activeIndex].challenge;
    setChallengeIndex(transition.activeIndex);
    setSelection(initialSelection(nextChallenge));
    setChallengeStartTime(completedAt);
    setShowHint(false);
    stats.current = { ...defaultStats };
    completing.current = false;
    scheduleHint();
  }

  async function finalizeRun(completedAt: number) {
    const elapsedMs = runStartTime === null ? 0 : completedAt - runStartTime;
    const startedAt = runStartedAtIso.current ?? new Date().toISOString();
    const completedAtIso = new Date().toISOString();
    const bests = await logger.getPersonalBests();
    const draftConfig = config;
    const key = personalBestKey(draftConfig);
    const best = bests[key];
    const isPersonalBest = !best || elapsedMs < best.elapsedMs;
    const summary = summarizeResult(
      `result-${Date.now()}`,
      draftConfig,
      startedAt,
      completedAtIso,
      elapsedMs,
      challengeResults.current,
      isPersonalBest,
    );
    const storedResult = await logger.saveResult(summary);
    setResult(storedResult);
    setPhase("complete");
    completing.current = false;
  }

  function playAgain() {
    setScreenFading(true);
    if (screenFadeTimeout.current) window.clearTimeout(screenFadeTimeout.current);
    screenFadeTimeout.current = window.setTimeout(() => {
      resetWithFreshSeed();
      requestAnimationFrame(() => setScreenFading(false));
      screenFadeTimeout.current = null;
    }, 180);
  }

  function resetWithFreshSeed() {
    const nextConfig = withFreshSeed(config);
    setConfig(nextConfig);
    saveSettings(nextConfig);
    resetPreview(nextConfig);
  }

  function practiceAgain(suggestion: PracticeSuggestion) {
    setScreenFading(true);
    if (screenFadeTimeout.current) window.clearTimeout(screenFadeTimeout.current);
    screenFadeTimeout.current = window.setTimeout(() => {
      const nextConfig = {
        ...config,
        mode: suggestion.mode,
        difficulty: suggestion.mode === "drill" ? "standard" : suggestion.difficulty,
        seedPack: suggestion.seedPack,
        practiceSkillPack: suggestion.skillPack,
      };
      setConfig(nextConfig);
      saveSettings(nextConfig);
      resetPreview(nextConfig);
      requestAnimationFrame(() => setScreenFading(false));
      screenFadeTimeout.current = null;
    }, 180);
  }

  function openSettings() {
    if (!midChallenge) setSettingsOpen(true);
  }

  function openHistory() {
    if (!midChallenge) setHistoryOpen(true);
  }

  function closeHistory() {
    setHistoryOpen(false);
  }

  function openShortcutMap() {
    setSettingsOpen(false);
    setShortcutMapOpen(true);
  }

  function closeShortcutMap() {
    setShortcutMapOpen(false);
  }

  function closeSettings() {
    setSettingsOpen(false);
    window.setTimeout(() => settingsButtonRef.current?.focus(), 0);
  }

  async function resetLocalData() {
    await logger.clearLocalResults();
  }

  function hideHintImmediately() {
    document.body.classList.add("typing-now");
    setShowHint(false);
    window.setTimeout(() => document.body.classList.remove("typing-now"), 80);
  }

  function clearScheduledWork() {
    if (hintTimeout.current) {
      window.clearTimeout(hintTimeout.current);
      hintTimeout.current = null;
    }
    if (completionFlashTimeout.current) {
      window.clearTimeout(completionFlashTimeout.current);
      completionFlashTimeout.current = null;
    }
    if (screenFadeTimeout.current) {
      window.clearTimeout(screenFadeTimeout.current);
      screenFadeTimeout.current = null;
    }
  }

  const partNumber = challengeIndex + 1;
  const totalParts = challenges.length;
  const showCompletedSegments = config.mode !== "coding";
  const hasCompletedSegments = showCompletedSegments && segments.some((segment) => segment.status === "complete");
  const drillResetVisible = config.mode === "drill" && phase === "active";
  const activeSegmentStyle = {
    "--active-rail-height": `${activeRailHeightFor(config.mode, currentText)}px`,
  } as CSSProperties;
  return (
    <MotionConfig reducedMotion={config.reducedMotion ? "always" : "user"}>
    <div className="app-shell" data-theme={config.theme} style={activeThemeStyle}>
      <div className="app-content" inert={settingsOpen || historyOpen || shortcutMapOpen ? true : undefined} aria-hidden={settingsOpen || historyOpen || shortcutMapOpen}>
      <Header
        platform={config.platform}
        onHome={goHome}
        onHistory={openHistory}
        onSettings={openSettings}
        historyDisabled={midChallenge}
        settingsDisabled={midChallenge}
        settingsButtonRef={settingsButtonRef}
      />
      {phase !== "complete" && (
        <ModeBar
          config={config}
          hidden={false}
          onModeChange={changeMode}
          onConfigChange={updateConfig}
        />
      )}
      <main className={screenFading ? "screen-crossfade" : ""}>
        {phase === "complete" && result ? (
          <ResultsScreen
            result={result}
            themeColors={activeThemeColors}
            onPlayAgain={playAgain}
            onPracticeAgain={practiceAgain}
          />
        ) : (
          <section className={`game-view difficulty-${config.difficulty} ${config.mode === "drill" ? "drill-view" : ""} ${config.mode === "coding" ? "coding-view" : ""}`}>
            <div className="status-row">
              <span className={`timer ${runStartTime !== null ? "running" : ""}`} data-testid="timer">
                {formatElapsed(visibleElapsed)}
              </span>
              <ProgressPips total={challenges.length} currentIndex={challengeIndex} phase={phase} completedPulseIndex={completedPulseIndex} />
            </div>
            <div className={`target-panel ${partTransition ? "updated" : ""}`} aria-live="polite">
              <div className="block-label accent">
                <span>{challenge.mode === "target-match" ? "target" : challenge.mode === "coding" ? "python target" : "prompt"}</span>
                <span className="part-label">part {partNumber} of {totalParts}</span>
              </div>
              <div
                key={challenge.id}
                className={`target-block ${partTransition ? "target-switched" : ""}`}
                id="target-text"
              >
                {challenge.mode === "drill"
                  ? challenge.prompt
                  : renderAttentionText(challenge.targetText, challenge.attentionRanges, currentText)}
              </div>
            </div>
            <div className={`editor-zone ${hasCompletedSegments ? "has-history" : ""} ${drillResetVisible ? "has-reset" : ""}`}>
              <div className="block-label edit-label">your edit</div>
              <div className={`editor-flow ${flowMatched ? "matched" : ""} ${drillResetVisible ? "has-reset" : ""}`} data-testid="editor-flow" ref={editorFlowRef}>
                <div className="locked-stack" aria-label="Completed edit history">
                  <div className="locked-stack-inner" ref={lockedStackInnerRef}>
                    {showCompletedSegments && segments.map((segment, index) => (
                      segment.status === "complete" ? (
                        <div
                          key={segment.challenge.id}
                          className={`locked-segment ${partTransition?.completedIndex === index ? "just-completed" : ""}`}
                          data-testid="locked-segment"
                        >
                          {segment.text}
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
                {phase !== "complete" && (
                  <div className={`active-segment ${partTransition?.activeIndex === challengeIndex ? "revealed" : ""} ${showHint ? "hinting" : ""}`} data-testid="active-segment" style={activeSegmentStyle}>
                    <EditableSurface
                      challenge={challenge}
                      active={active}
                      focusLocked={!settingsOpen}
                      currentText={currentText}
                      targetText={challenge.targetText}
                      showDiff={false}
                      nativeCaretFallback={nativeCaretFallback}
                      initialSelection={challengeInitialSelection}
                      resetKey={editorResetKey}
                      smartPairs={config.mode === "coding" && config.smartPairs}
                      onInputText={handleInputText}
                      onSelection={handleSelection}
                      onKeyDown={handleEditorKeyDown}
                      onPointerDown={handlePointerDown}
                      onMouseDown={handleMouseDown}
                      onClipboard={handleClipboard}
                    />
                  </div>
                )}
                {drillResetVisible && (
                  <div className="drill-safety" data-testid="drill-safety">
                    <button type="button" className="btn-ghost" onClick={resetCurrentDrill}>
                      <span>reset drill</span>
                      <ShortcutHint keys={[config.platform === "mac" ? "⌥" : "alt", "R"]} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      {phase !== "complete" && (
        <footer>
          <span><kbd className="kbd">esc</kbd> settings</span>
          <button
            type="button"
            className="footer-keyboard"
            onClick={openShortcutMap}
          >
            <span aria-hidden="true">⌨</span>
            <span>shortcut map</span>
          </button>
          {midChallenge && (
            <button type="button" className="footer-keyboard danger-footer-action" onClick={giveUp}>
              give up
            </button>
          )}
        </footer>
      )}
      </div>
      <SettingsPanel
        open={settingsOpen}
        config={config}
        onClose={closeSettings}
        onChange={updateConfig}
        onShortcutMap={openShortcutMap}
        onResetLocalData={resetLocalData}
      />
      <HistoryPanel
        open={historyOpen}
        logger={logger}
        onClose={closeHistory}
      />
      <ShortcutMapPanel
        open={shortcutMapOpen}
        platform={config.platform}
        onClose={closeShortcutMap}
      />
    </div>
    </MotionConfig>
  );
}

function renderAttentionText(text: string, ranges: Challenge["attentionRanges"], sourceText?: string): ReactNode {
  if (ranges.length === 0) return text;
  const orderedRanges = ranges
    .filter((range) => range.start >= 0 && range.end > range.start && range.end <= text.length)
    .sort((first, second) => first.start - second.start);
  const nodes: ReactNode[] = [];
  const highlighted = new Map<number, string>();
  const changedTargetIndexes = sourceText === undefined ? undefined : changedTargetCharacterIndexes(sourceText, text);

  if (sourceText !== undefined) {
    changedTargetIndexes?.forEach((index) => {
      if (/\s/.test(text[index])) return;
      const rangeReason = orderedRanges.find((range) => index >= range.start && index < range.end)?.reason;
      highlighted.set(index, rangeReason ?? "missing from active edit");
    });
  } else {
    orderedRanges.forEach((range) => {
      for (let cursor = range.start; cursor < range.end; cursor += 1) {
        if (!/\s/.test(text[cursor])) {
          highlighted.set(cursor, range.reason);
          break;
        }
      }
    });
  }

  for (let index = 0; index < text.length; index += 1) {
    const reason = highlighted.get(index);
    if (reason) {
      nodes.push(
        <span className="target-attention" title={reason} key={`${index}-${text[index]}`}>
          {text[index]}
        </span>,
      );
    } else {
      nodes.push(text[index]);
    }
  }

  return nodes;
}

function activeRailHeightFor(mode: Mode, text: string): number {
  const lineHeight = mode === "drill" ? 34 : 34;
  if (mode === "drill") return lineHeight;
  const lineCount = Math.min(3, Math.max(1, text.split("\n").length));
  return lineHeight * lineCount;
}

function buildChallenges(config: TestConfig): Challenge[] {
  if (config.mode === "target-match") {
    return generateTargetChallenges(config.challengeCount, config.seedPack, {
      difficulty: config.difficulty,
      skillPack: config.practiceSkillPack ?? undefined,
    });
  }
  if (config.mode === "coding") {
    return generatePythonChallenges(
      config.challengeCount,
      config.seedPack,
      config.difficulty,
      config.practiceSkillPack ?? undefined,
    );
  }
  return generateDrillChallenges(config.challengeCount, config.seedPack, config.practiceSkillPack ?? undefined);
}

function withFreshSeed(config: TestConfig): TestConfig {
  return {
    ...config,
    seedPack: freshSeedPack(),
    practiceSkillPack: null,
  };
}

function freshSeedPack(): string {
  const fixedSeed = seedFromLocation();
  if (fixedSeed) return fixedSeed;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `live-${time}-${random}`;
}

function seedFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const seed = new URLSearchParams(window.location.search).get("seed")?.trim();
  return seed || null;
}

function initialSelection(challenge: Challenge): SelectionState {
  return challenge.drill?.initialSelection ?? {
    start: challenge.editableText.length,
    end: challenge.editableText.length,
  };
}

function isModifierKey(key: string): boolean {
  return ["Shift", "Alt", "Control", "Meta", "CapsLock", "Tab", "Escape"].includes(key);
}

function isRunStartingEditorKey(event: React.KeyboardEvent<HTMLDivElement>): boolean {
  if (event.key === "Escape" || event.key === "Tab") return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (isModifierKey(event.key)) return false;
  return event.key.length === 1
    || event.key === "Enter"
    || event.key === "Backspace"
    || event.key === "Delete";
}

function isAltShortcut(event: KeyboardEvent): boolean {
  return event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

function playCompleteSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 420;
    gain.gain.value = 0.025;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.045);
  } catch {
    // Audio is optional and browser-gated; failure should not affect gameplay.
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
