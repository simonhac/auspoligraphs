export interface ToggleOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ToggleProps<T extends string> {
  /** Two or more options rendered left→right. */
  options: ToggleOption<T>[];
  /** Currently-selected option value. */
  value: T;
  onChange: (value: T) => void;
  /** Optional caption shown before the control. */
  label?: string;
  /** Grey out and ignore clicks. Default false. */
  disabled?: boolean;
}

/** An N-option segmented control. Re-rendering with a new value lets each
 *  chart animate between datasets. Used by every chart demo. */
export function Toggle<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
}: ToggleProps<T>) {
  return (
    <div className={`toggle-field${disabled ? " is-disabled" : ""}`}>
      {label && <span className="toggle-label">{label}</span>}
      <div className="seg" role="group" aria-label={label ?? "options"} aria-disabled={disabled}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`seg-btn${value === o.value ? " is-active" : ""}`}
            aria-pressed={value === o.value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
