import { useEffect, useRef } from "react";

export interface FormError {
  field: string;
  message: string;
}

export function ErrorSummary({ errors, id = "form-error-summary" }: { errors: FormError[]; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const signature = errors.map((e) => e.field + ":" + e.message).join("|");

  useEffect(() => {
    if (errors.length > 0) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (errors.length === 0) return null;

  return (
    <div className="error-summary" role="alert" tabIndex={-1} ref={ref} id={id} aria-labelledby={`${id}-title`}>
      <b id={`${id}-title`}>There is a problem</b>
      <ul>
        {errors.map((e) => (
          <li key={e.field + e.message}>
            <a
              href={`#${e.field}`}
              onClick={(ev) => {
                ev.preventDefault();
                document.getElementById(e.field)?.focus();
              }}
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
