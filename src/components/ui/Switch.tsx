interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

/** Accessible toggle switch (design-system control). */
export default function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}
