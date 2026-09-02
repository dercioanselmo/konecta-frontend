const TONE_CLASSES = {
  neutral: "bg-surface text-muted border-border",
  success: "bg-brand-green/10 text-brand-green border-brand-green/30",
  warning: "bg-brand-orange/10 text-brand-orange border-brand-orange/30",
  danger: "bg-red-500/10 text-red-500 border-red-500/30",
} as const;

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof TONE_CLASSES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
