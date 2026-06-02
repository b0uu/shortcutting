import { motion } from "framer-motion";

type ProgressPipsProps = {
  total: number;
  currentIndex: number;
  phase: "pre-test" | "intro" | "active" | "complete";
  completedPulseIndex: number | null;
};

export function ProgressPips({ total, currentIndex, phase, completedPulseIndex }: ProgressPipsProps) {
  return (
    <div className="pips" aria-label={`${Math.min(currentIndex + 1, total)} of ${total} parts`}>
      {Array.from({ length: total }, (_, index) => {
        const state = phase === "complete" || index < currentIndex
          ? "done"
          : index === currentIndex
            ? "current"
            : "upcoming";

        return (
          <motion.span
            key={index}
            className={`pip ${state}`}
            animate={{ scale: index === completedPulseIndex ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          />
        );
      })}
    </div>
  );
}
