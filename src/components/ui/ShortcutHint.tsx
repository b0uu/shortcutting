type ShortcutHintProps = {
  keys: string[];
};

export function ShortcutHint({ keys }: ShortcutHintProps) {
  return (
    <span className="shortcut-hint" aria-hidden="true">
      {keys.map((key) => (
        <kbd key={key}>{key}</kbd>
      ))}
    </span>
  );
}
