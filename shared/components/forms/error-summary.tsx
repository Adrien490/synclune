"use client";

import { CircleAlert } from "lucide-react";
import { useCallback } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";

export interface ErrorSummaryField {
	/** Target element `id` — clicking the list item scrolls + focuses it. */
	name: string;
	/** Human-readable label shown in the link. */
	label: string;
	/** Validation message associated with the field. */
	message: string;
}

interface ErrorSummaryProps {
	fieldErrors: ErrorSummaryField[];
	/**
	 * Optional element id that wraps the form. When provided, fallback lookup
	 * scopes the query inside this container (avoids colliding ids elsewhere).
	 */
	formId?: string;
	/** Override the default title heading. */
	title?: string;
	/**
	 * Announcement priority for screen readers.
	 * - `"polite"` (default): queues after current announcements, less intrusive.
	 * - `"assertive"`: interrupts — use only for critical failures.
	 */
	ariaLive?: "polite" | "assertive";
	className?: string;
}

/**
 * Form-wide error summary with deep-link navigation to each invalid field.
 *
 * Renders a `role="alert"` + `aria-live="polite"` container listing every
 * validation error. Each entry is a button that scrolls the corresponding
 * field into view and moves focus (WCAG 3.3.1 Error Identification).
 *
 * Usage:
 * ```tsx
 * const fieldErrors = Object.entries(form.state.fieldMeta)
 *   .filter(([, meta]) => meta.errors.length)
 *   .map(([name, meta]) => ({ name, label: LABELS[name], message: meta.errors[0]! }));
 *
 * <ErrorSummary fieldErrors={fieldErrors} />
 * ```
 */
export function ErrorSummary({
	fieldErrors,
	formId,
	title,
	ariaLive = "polite",
	className,
}: ErrorSummaryProps) {
	const focusField = useCallback(
		(name: string) => {
			const scope = formId ? document.getElementById(formId) : document;
			const el =
				scope?.querySelector<HTMLElement>(`#${CSS.escape(name)}`) ?? document.getElementById(name);
			if (!el) return;
			const reduced =
				typeof window !== "undefined" &&
				window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
			if (typeof el.focus === "function") el.focus({ preventScroll: true });
		},
		[formId],
	);

	if (fieldErrors.length === 0) return null;

	return (
		<Alert variant="destructive" role="alert" aria-live={ariaLive} className={className}>
			<CircleAlert className="size-4" />
			<AlertTitle>
				{title ??
					(fieldErrors.length === 1
						? "1 erreur trouvée"
						: `${fieldErrors.length} erreurs trouvées`)}
			</AlertTitle>
			<AlertDescription>
				<ul className="mt-1 space-y-1">
					{fieldErrors.map(({ name, label, message }) => (
						<li key={name}>
							<button
								type="button"
								className="underline hover:no-underline"
								onClick={() => focusField(name)}
							>
								{label}
							</button>{" "}
							: {message}
						</li>
					))}
				</ul>
			</AlertDescription>
		</Alert>
	);
}
