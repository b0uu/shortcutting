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
import { getSelectionRange, setSelectionRange } from "@/domain/text";
import {
  completeActiveSegment,
  createSegments,
  updateActiveSegmentText,
  type ChallengeSegment,
} from "@/domain/segments";
import { formatElapsed } from "@/domain/timer";
import { validateChallenge } from "@/domain/validation";
import type { AccountProfile, AccountUser } from "@/domain/cloud/accounts";
import type {
  Challenge,
  ChallengeCount,
  ChallengeResult,
  EditEvent,
  Mode,
  PracticeSuggestion,
  SelectionState,
  TestConfig,
  TestResult,
} from "@/domain/types";
import { LocalResultLogger } from "@/storage/localResultLogger";
import { CloudResultLogger } from "@/storage/cloudResultLogger";
import { HybridResultLogger } from "@/storage/hybridResultLogger";
import { importLocalHistoryOnce } from "@/storage/cloudImport";
import { loadSettings, saveSettings } from "@/storage/settingsStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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

const defaultPartCounts: ChallengeCount[] = [3, 4];
const drillPartCounts: ChallengeCount[] = [5, 10, 15];

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

const COMPLETION_FEEDBACK_MS = 260;
const COMPLETION_FLASH_MS = 1200;
const QUICK_CROSSFADE_MS = 35;
const RESULTS_CROSSFADE_MS = 220;
const ROUTE_PANEL_OPEN_DELAY_MS = 260;

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
  const localLogger = useMemo(() => new LocalResultLogger(), []);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const cloudLogger = useMemo(() => accountUser ? new CloudResultLogger() : null, [accountUser]);
  const logger = useMemo(() => new HybridResultLogger(localLogger, cloudLogger), [cloudLogger, localLogger]);
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
  const feedbackPausedMs = useRef(0);
  const hintTimeout = useRef<number | null>(null);
  const completionFlashTimeout = useRef<number | null>(null);
  const completionAdvanceTimeout = useRef<number | null>(null);
  const lockedStackInnerRef = useRef<HTMLDivElement | null>(null);
  const editorFlowRef = useRef<HTMLDivElement | null>(null);
  const completing = useRef(false);
  const latestText = useRef(challenges[0].editableText);
  const segmentsRef = useRef(segments);
  const latestSelection = useRef(selection);
  const maybeCompleteRef = useRef<(text: string, selection: SelectionState) => void>(() => {});
  const challengeIndexRef = useRef(challengeIndex);
  const runStartTimeRef = useRef<number | null>(null);
  const challengeStartTimeRef = useRef<number | null>(null);
  const configModeRef = useRef(config.mode);

  const challenge = segments[challengeIndex]?.challenge ?? challenges[0];
  const currentText = segments[challengeIndex]?.text ?? challenge.editableText;
  const challengeInitialSelection = useMemo(() => initialSelection(challenge), [challenge]);
  const midChallenge = phase === "active";
  const active = phase !== "complete";
  const visibleElapsed = result?.elapsedMs ?? (runStartTime === null ? 0 : Math.max(0, now - runStartTime - feedbackPausedMs.current));
  const activeThemeColors = useMemo(() => colorsForTheme(config.theme, config.customTheme), [config.customTheme, config.theme]);
  const activeThemeStyle = useMemo(() => themeCssVariables(activeThemeColors) as CSSProperties, [activeThemeColors]);
  // Native caret is an intentional MVP fallback until custom mid-text cursor rendering is robust.
  const nativeCaretFallback = true;

  useEffect(() => {
    const detected = detectPlatform(navigator.userAgent, navigator.platform);
    const merged = loadSettings(defaultConfig, detected);
    const liveConfig = normalizeChallengeCountForMode(withFreshSeed(merged));
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
    let openPanelTimeout: number | null = null;

    function readRequestedPanel(): "history" | "settings" | null {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const storedPanel = window.sessionStorage.getItem("shortcutting:open-panel");
      const panel = storedPanel ?? url.searchParams.get("panel") ?? hashParams.get("panel");
      return panel === "history" || panel === "settings" ? panel : null;
    }

    function clearRequestedPanel() {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      window.sessionStorage.removeItem("shortcutting:open-panel");
      url.searchParams.delete("panel");
      if (hashParams.has("panel")) url.hash = "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    function openRequestedPanel() {
      const panel = readRequestedPanel();
      if (!panel) return;
      if (openPanelTimeout) window.clearTimeout(openPanelTimeout);
      openPanelTimeout = window.setTimeout(() => {
        if (panel === "history") {
          setHistoryOpen(true);
        } else {
          setSettingsOpen(true);
        }
        clearRequestedPanel();
      }, ROUTE_PANEL_OPEN_DELAY_MS);
    }

    openRequestedPanel();
    window.addEventListener("hashchange", openRequestedPanel);
    window.addEventListener("popstate", openRequestedPanel);
    return () => {
      if (openPanelTimeout) window.clearTimeout(openPanelTimeout);
      window.removeEventListener("hashchange", openRequestedPanel);
      window.removeEventListener("popstate", openRequestedPanel);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const supabaseClient = supabase;
    let cancelled = false;

    async function loadAccount() {
      const { data } = await supabaseClient.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setAccountUser(null);
        setAccountProfile(null);
        return;
      }
      await loadCloudAccount(data.user.id, data.user.email ?? null);
      await autoImportLocalHistory(data.user.id);
    }

    void loadAccount();
    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAccountUser(null);
        setAccountProfile(null);
        return;
      }
      void loadCloudAccount(session.user.id, session.user.email ?? null)
        .then(() => autoImportLocalHistory(session.user.id));
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localLogger, supabase]);

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
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    latestSelection.current = selection;
  }, [selection]);

  useEffect(() => {
    maybeCompleteRef.current = maybeComplete;
  });

  useEffect(() => {
    configModeRef.current = config.mode;
  }, [config.mode]);

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

      if (event.key === "Escape" && phaseRef.current !== "active") {
        openSettings();
        return;
      }

      if (!settingsOpen && config.mode === "drill" && phase !== "complete" && isAltShortcut(event) && getSiteShortcutKey(event) === "r") {
        event.preventDefault();
        resetCurrentDrill();
        return;
      }

      if (settingsOpen || historyOpen || shortcutMapOpen || midChallenge || phase !== "pre-test" || !isAltShortcut(event)) {
        return;
      }

      const key = getSiteShortcutKey(event);
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
    const nextSegments = createSegments(nextChallenges);
    setChallenges(nextChallenges);
    segmentsRef.current = nextSegments;
    setSegments(nextSegments);
    currentChallengeRef.current = nextChallenges[0];
    setChallengeIndex(0);
    challengeIndexRef.current = 0;
    const nextSelection = initialSelection(nextChallenges[0]);
    latestSelection.current = nextSelection;
    setSelection(nextSelection);
    setPhase("pre-test");
    setShowHint(false);
    setRunStartTime(null);
    runStartTimeRef.current = null;
    challengeStartTimeRef.current = null;
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
    feedbackPausedMs.current = 0;
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
    const nextConfig = normalizeChallengeCountForMode({
      ...config,
      ...patch,
      platform: resolvePlatform(nextPreference, detected),
      practiceSkillPack: shouldClearPracticeFocus ? null : (patch.practiceSkillPack ?? config.practiceSkillPack ?? null),
      seedPack: patch.seedPack ?? (shouldFreshenSeed ? freshSeedPack() : config.seedPack),
    });
    if (shouldCrossfadePreview(patch)) {
      crossfadeToConfig(nextConfig);
    } else {
      setConfig(nextConfig);
      saveSettings(nextConfig);
      resetPreview(nextConfig);
    }
  }

  function changeMode(mode: Mode) {
    updateConfig({ mode });
  }

  function goHome() {
    closeSettings();
    closeHistory();
    closeShortcutMap();
    crossfadeToConfig(withFreshSeed(config));
  }

  function giveUp() {
    resetWithFreshSeed();
  }

  function startRunFromEditorInput() {
    if (phaseRef.current !== "pre-test") return;
    const start = performance.now();
    if (runStartTimeRef.current === null) {
      setRunStartTime(start);
      runStartTimeRef.current = start;
      setNow(start);
      runStartedAtIso.current = new Date().toISOString();
    }
    challengeStartTimeRef.current = start;
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
  useLayoutEffect(() => {
    phaseRef.current = phase;
    currentChallengeRef.current = challenge;
    challengeIndexRef.current = challengeIndex;
  }, [phase, challenge, challengeIndex]);

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!active) return;
    if (isSiteShortcut(event)) {
      event.preventDefault();
      return;
    }
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
    setSegments((currentSegments) => {
      const nextSegments = updateActiveSegmentText(currentSegments, text);
      segmentsRef.current = nextSegments;
      return nextSegments;
    });
    setSelection(nextSelection);
    if (phaseRef.current === "active") {
      editEvents.current.push(createEditEvent("input", currentChallengeRef.current.id, performance.now(), {
        textAfter: text,
        selectionAfter: nextSelection,
      }));
      maybeComplete(text, nextSelection);
    }
  }

  const handleSelection = useCallback((nextSelection: SelectionState) => {
    const previousSelection = latestSelection.current;
    const drillSelectionStartedRun = phaseRef.current === "pre-test"
      && configModeRef.current === "drill"
      && !sameSelection(previousSelection, nextSelection);
    if (drillSelectionStartedRun) startRunFromEditorInput();

    latestSelection.current = nextSelection;
    setSelection(nextSelection);
    if (phaseRef.current === "active") {
      editEvents.current.push(createEditEvent("selectionchange", currentChallengeRef.current.id, performance.now(), {
        selectionAfter: nextSelection,
      }));
      maybeCompleteRef.current(latestText.current, nextSelection);
    }
    // startRunFromEditorInput reads refs/setters; keeping this callback stable
    // prevents the editor focus effect from rerunning on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (phaseRef.current === "complete") return;
    if (config.mousePolicy === "keyboard-only") {
      const preservedSelection = getSelectionRange(event.currentTarget);
      event.preventDefault();
      event.stopPropagation();
      latestSelection.current = preservedSelection;
      preserveKeyboardOnlySelection(event.currentTarget, preservedSelection);
      return;
    }
    if (phaseRef.current !== "active") return;
    stats.current.mouseActions += 1;
    editEvents.current.push(createEditEvent("mouse", challenge.id, performance.now(), {
      textBefore: latestText.current,
      selectionBefore: latestSelection.current,
    }));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current === "complete") return;
    if (config.mousePolicy !== "keyboard-only") return;
    const preservedSelection = getSelectionRange(event.currentTarget);
    event.preventDefault();
    event.stopPropagation();
    latestSelection.current = preservedSelection;
    preserveKeyboardOnlySelection(event.currentTarget, preservedSelection);
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
    setSegments((currentSegments) => {
      const nextSegments = updateActiveSegmentText(currentSegments, resetText);
      segmentsRef.current = nextSegments;
      return nextSegments;
    });
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
    const completedChallenge = currentChallengeRef.current;
    const completedIndex = challengeIndexRef.current;
    if (hintTimeout.current) window.clearTimeout(hintTimeout.current);
    const completedAt = performance.now();
    const startedAt = challengeStartTimeRef.current ?? completedAt;
    const challengeResult: ChallengeResult = {
      challengeId: completedChallenge.id,
      mode: completedChallenge.mode,
      beforeText: completedChallenge.editableText,
      targetText: completedChallenge.targetText,
      finalText,
      elapsedMs: Math.max(0, completedAt - startedAt),
      skillTags: Array.from(new Set(completedChallenge.errors.flatMap((error) => error.skillTags))),
      skillPacks: completedChallenge.skillPacks,
      estimatedCorrections: completedChallenge.estimatedCorrections,
      ...stats.current,
    };
    challengeResults.current = [...challengeResults.current, challengeResult];
    playCompleteSound(config.soundEnabled);
    const feedbackSegments = updateActiveSegmentText(segmentsRef.current, finalText);
    segmentsRef.current = feedbackSegments;
    setSegments(feedbackSegments);
    const transition = completeActiveSegment(feedbackSegments, finalText);
    setFlowMatched(true);
    setCompletedPulseIndex(completedIndex);
    if (completionAdvanceTimeout.current) window.clearTimeout(completionAdvanceTimeout.current);
    completionAdvanceTimeout.current = window.setTimeout(() => {
      segmentsRef.current = transition.segments;
      setSegments(transition.segments);

      if (transition.complete) {
        finalizeRun(completedAt);
        completionAdvanceTimeout.current = null;
        return;
      }

      const resumedAt = performance.now();
      feedbackPausedMs.current += Math.max(0, resumedAt - completedAt);
      setPartTransition({ completedIndex, activeIndex: transition.activeIndex });
      if (completionFlashTimeout.current) window.clearTimeout(completionFlashTimeout.current);
      completionFlashTimeout.current = window.setTimeout(() => {
        setFlowMatched(false);
        setCompletedPulseIndex(null);
        setPartTransition(null);
        completionFlashTimeout.current = null;
      }, COMPLETION_FLASH_MS);

      const nextChallenge = transition.segments[transition.activeIndex].challenge;
      currentChallengeRef.current = nextChallenge;
      challengeIndexRef.current = transition.activeIndex;
      setChallengeIndex(transition.activeIndex);
      const nextSelection = initialSelection(nextChallenge);
      latestSelection.current = nextSelection;
      setSelection(nextSelection);
      challengeStartTimeRef.current = resumedAt;
      setShowHint(false);
      stats.current = { ...defaultStats };
      completing.current = false;
      scheduleHint();
      completionAdvanceTimeout.current = null;
    }, COMPLETION_FEEDBACK_MS);
  }

  async function finalizeRun(completedAt: number) {
    const startedAtMs = runStartTimeRef.current;
    const elapsedMs = startedAtMs === null ? 0 : Math.max(0, completedAt - startedAtMs - feedbackPausedMs.current);
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
      editEvents.current,
    );
    const storedResult = await logger.saveResult(summary);
    setResult(storedResult);
    setPhase("complete");
    completing.current = false;
  }

  function playAgain() {
    crossfadeToConfig(withFreshSeed(config), RESULTS_CROSSFADE_MS);
  }

  function resetWithFreshSeed() {
    const nextConfig = withFreshSeed(config);
    setConfig(nextConfig);
    saveSettings(nextConfig);
    resetPreview(nextConfig);
  }

  function crossfadeToConfig(nextConfig: TestConfig, durationMs = QUICK_CROSSFADE_MS) {
    setScreenFading(true);
    if (screenFadeTimeout.current) window.clearTimeout(screenFadeTimeout.current);
    setConfig(nextConfig);
    saveSettings(nextConfig);
    resetPreview(nextConfig);
    screenFadeTimeout.current = window.setTimeout(() => {
      setScreenFading(false);
      screenFadeTimeout.current = null;
    }, durationMs);
  }

  function practiceAgain(suggestion: PracticeSuggestion) {
    crossfadeToConfig({
      ...config,
      mode: suggestion.mode,
      difficulty: suggestion.mode === "drill" ? "standard" : suggestion.difficulty,
      seedPack: suggestion.seedPack,
      practiceSkillPack: suggestion.skillPack,
    }, RESULTS_CROSSFADE_MS);
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

  function toggleLightDarkTheme() {
    updateConfig({ theme: config.theme === "light" ? "dark" : "light" });
  }

  function closeShortcutMap() {
    setShortcutMapOpen(false);
  }

  function closeSettings() {
    setSettingsOpen(false);
    window.setTimeout(() => settingsButtonRef.current?.focus(), 0);
  }

  async function resetLocalData() {
    await localLogger.clearLocalResults();
  }

  async function loadCloudAccount(userId: string, email: string | null) {
    setAccountUser({ id: userId, email });
    try {
      const response = await fetch("/api/me/profile");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not load account.");
      setAccountProfile(payload.profile);
    } catch {
      setAccountProfile(null);
    }
  }

  async function autoImportLocalHistory(userId: string) {
    const results = await localLogger.getResults();
    try {
      await importLocalHistoryOnce(userId, results);
    } catch {
      // Leaving the import marker unset lets the next signed-in session retry.
    }
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
    if (completionAdvanceTimeout.current) {
      window.clearTimeout(completionAdvanceTimeout.current);
      completionAdvanceTimeout.current = null;
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
  const accountHref = accountProfile?.handle ? `/profile/${accountProfile.handle}` : "/onboarding";
  return (
    <MotionConfig reducedMotion={config.reducedMotion ? "always" : "user"}>
    <div className="app-shell" data-theme={config.theme} style={activeThemeStyle}>
      <div className="app-content" inert={settingsOpen || historyOpen || shortcutMapOpen ? true : undefined} aria-hidden={settingsOpen || historyOpen || shortcutMapOpen}>
      <Header
        platform={config.platform}
        onHome={goHome}
        onHistory={openHistory}
        accountHref={accountHref}
        onSettings={openSettings}
        historyDisabled={midChallenge}
        leaderboardDisabled={midChallenge}
        accountDisabled={midChallenge}
        settingsDisabled={midChallenge}
        settingsButtonRef={settingsButtonRef}
        accountLabel={accountUser ? accountProfile?.handle ?? "account" : "sign in"}
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
            accountConnected={accountUser !== null}
            accountHref="/onboarding"
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
                  : challenge.mode === "coding"
                    ? renderCodingTargetText(challenge.targetText, challenge.attentionRanges, currentText)
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
          <span className="footer-reset-indicator">
            <kbd className="kbd">{config.platform === "mac" ? "⌥" : "alt"}</kbd>
            <kbd className="kbd">R</kbd>
            reset
          </span>
          <span><kbd className="kbd">esc</kbd> settings</span>
          <button
            type="button"
            className="footer-keyboard"
            onClick={openShortcutMap}
          >
            <span aria-hidden="true">⌨</span>
            <span>shortcut map</span>
          </button>
          <button
            type="button"
            className="footer-keyboard"
            aria-label={config.theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            onClick={toggleLightDarkTheme}
          >
            <span aria-hidden="true">{config.theme === "light" ? "◐" : "◑"}</span>
            <span>{config.theme === "light" ? "dark" : "light"}</span>
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
  if (ranges.length === 0 && sourceText === undefined) return text;
  const highlighted = buildTargetHighlightMap(text, ranges, sourceText);
  if (highlighted.size === 0) return text;
  const nodes: ReactNode[] = [];

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

function renderCodingTargetText(text: string, ranges: Challenge["attentionRanges"], sourceText?: string): ReactNode {
  const highlighted = buildTargetHighlightMap(text, ranges, sourceText);
  const nodes: ReactNode[] = [];
  let index = 0;

  for (const line of text.split("\n")) {
    const leadingSpaces = line.match(/^ */)?.[0].length ?? 0;
    let consumedIndent = 0;

    while (consumedIndent + 4 <= leadingSpaces) {
      const key = `indent-${index}-${consumedIndent}`;
      nodes.push(
        <span className="target-indent-guide" aria-hidden="true" key={key}>
          {"    "}
        </span>,
      );
      index += 4;
      consumedIndent += 4;
    }

    while (consumedIndent < leadingSpaces) {
      nodes.push(" ");
      index += 1;
      consumedIndent += 1;
    }

    for (let lineIndex = leadingSpaces; lineIndex < line.length; lineIndex += 1) {
      const reason = highlighted.get(index);
      const character = line[lineIndex];
      nodes.push(reason ? (
        <span className="target-attention" title={reason} key={`${index}-${character}`}>
          {character}
        </span>
      ) : character);
      index += 1;
    }

    if (index < text.length) {
      nodes.push("\n");
      index += 1;
    }
  }

  return nodes.length > 0 ? nodes : text;
}

function buildTargetHighlightMap(text: string, ranges: Challenge["attentionRanges"], sourceText?: string): Map<number, string> {
  const orderedRanges = ranges
    .filter((range) => range.start >= 0 && range.end > range.start && range.end <= text.length)
    .sort((first, second) => first.start - second.start);
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

  return highlighted;
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

function shouldCrossfadePreview(patch: Partial<TestConfig>): boolean {
  return patch.mode !== undefined
    || patch.difficulty !== undefined
    || patch.challengeCount !== undefined
    || patch.practiceSkillPack !== undefined
    || patch.seedPack !== undefined;
}

function normalizeChallengeCountForMode(config: TestConfig): TestConfig {
  if (config.mode === "drill") {
    return drillPartCounts.includes(config.challengeCount) ? config : { ...config, challengeCount: 5 };
  }
  return defaultPartCounts.includes(config.challengeCount) ? config : { ...config, challengeCount: 3 };
}

function initialSelection(challenge: Challenge): SelectionState {
  return challenge.drill?.initialSelection ?? {
    start: challenge.editableText.length,
    end: challenge.editableText.length,
  };
}

function sameSelection(first: SelectionState, second: SelectionState): boolean {
  return first.start === second.start && first.end === second.end;
}

function preserveKeyboardOnlySelection(element: HTMLDivElement, selection: SelectionState) {
  element.focus();
  setSelectionRange(element, selection.start, selection.end);
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

type ShortcutKeyEvent = Pick<KeyboardEvent | React.KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "key" | "code">;

function isAltShortcut(event: ShortcutKeyEvent): boolean {
  return event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

function isSiteShortcut(event: ShortcutKeyEvent): boolean {
  if (!isAltShortcut(event)) return false;
  return getSiteShortcutKey(event) !== null;
}

function getSiteShortcutKey(event: ShortcutKeyEvent): "1" | "2" | "3" | "h" | "y" | "r" | null {
  const keyFromCode = shortcutKeyFromCode(event.code);
  if (keyFromCode) return keyFromCode;

  const key = event.key.toLowerCase();
  if (key === "1" || key === "2" || key === "3" || key === "h" || key === "y" || key === "r") {
    return key;
  }
  return null;
}

function shortcutKeyFromCode(code: string): "1" | "2" | "3" | "h" | "y" | "r" | null {
  if (code === "Digit1") return "1";
  if (code === "Digit2") return "2";
  if (code === "Digit3") return "3";
  if (code === "KeyH") return "h";
  if (code === "KeyY") return "y";
  if (code === "KeyR") return "r";
  return null;
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
