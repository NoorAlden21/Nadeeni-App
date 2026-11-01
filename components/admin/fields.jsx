export const fieldClass =
  "h-12 w-full rounded-2xl border border-burgundy/15 bg-white px-4 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold";

export const labelClass = "mb-1.5 block text-sm font-semibold text-burgundy-deep";

export function Field({ id, label, children }) {
  return (
    <label htmlFor={id} className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ id, dir = "rtl", ...props }) {
  return <input id={id} dir={dir} className={fieldClass} {...props} />;
}

export function SelectInput({ id, children, ...props }) {
  return (
    <select id={id} className={fieldClass} {...props}>
      {children}
    </select>
  );
}
