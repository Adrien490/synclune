"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/shared/utils/cn";

/**
 * ⚠️ Pas de `Progress.Track` entre le Root et l'Indicator, alors que c'est
 * l'anatomie documentée par Base UI. Deux raisons : `Track` est purement
 * présentationnel (l'Indicator lit `useProgressRootContext`, pas un contexte de
 * Track), et cinq classes appelantes ciblent l'indicateur en ENFANT DIRECT
 * (`[&>[data-slot=progress-indicator]]:…` dans `vat-progress-card` et
 * `upload-progress`, dont l'animation indéterminée). L'insérer les casserait
 * toutes, sans erreur ni test rouge.
 */
function Progress({
	className,
	value,
	"aria-label": ariaLabel = "Progression",
	...props
}: Omit<ProgressPrimitive.Root.Props, "value"> & {
	/**
	 * Base UI exige `number | null` (null = indéterminé). On accepte aussi
	 * `undefined` — les appelants passent `value={condition ? x : undefined}` —
	 * et on le normalise en `null`.
	 */
	value?: number | null;
}) {
	return (
		<ProgressPrimitive.Root
			data-slot="progress"
			value={value ?? null}
			aria-label={ariaLabel}
			className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
			{...props}
		>
			{/* Base UI pose lui-même `width: X%` (+ `height: inherit`) en style inline
			    sur l'Indicator — d'où la transition sur `width` et non plus sur
			    `transform`, qu'animait le translateX de la version Radix. Un `value`
			    absent n'est plus « 0 % » mais un état INDÉTERMINÉ : aucune largeur
			    inline, `data-indeterminate` sur le Root, pas d'`aria-valuenow`. */}
			<ProgressPrimitive.Indicator
				data-slot="progress-indicator"
				className="bg-primary h-full motion-safe:transition-[width] motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-premium)]"
			/>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
