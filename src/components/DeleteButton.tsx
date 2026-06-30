"use client";

/** Form de eliminação com confirmação. Envolve uma Server Action; se o
 *  utilizador cancelar o confirm(), a submissão é abortada. */
export function DeleteButton({
  action,
  confirmText,
  className,
  title,
  children,
  formStyle,
}: {
  action: () => void | Promise<void>;
  confirmText: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
  formStyle?: React.CSSProperties;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      style={formStyle}
    >
      <button type="submit" className={className} title={title}>
        {children}
      </button>
    </form>
  );
}
