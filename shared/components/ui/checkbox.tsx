"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/shared/utils/cn";

/**
 * ⚠️ `checked` est désormais un `boolean` STRICT. Radix modélisait l'état
 * indéterminé par la valeur sentinelle `checked="indeterminate"` ; Base UI en
 * fait un prop `indeterminate` distinct. Le callback est donc lui aussi
 * re-typé : `(checked: boolean)` au lieu de `(checked: CheckedState)` — le
 * second argument `eventDetails` de Base UI est volontairement masqué aux
 * appelants, aucun n'en a besoin.
 */
/** @public Surface du kit shadcn/ui vendored — exempté du rapport knip. */
export type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, "onCheckedChange"> & {
	onCheckedChange?: (checked: boolean) => void;
};

function Checkbox({ className, indeterminate, onCheckedChange, ...props }: CheckboxProps) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			indeterminate={indeterminate}
			onCheckedChange={onCheckedChange ? (checked: boolean) => onCheckedChange(checked) : undefined}
			className={cn(
				// Rose PROFOND sur les états cochés : la pastille pleine EST le signal, et
				// en pastel elle ne se détachait du fond blanc qu'à 1,6:1. L'encre reste
				// `--primary-foreground` (quasi-noir), à 5,7:1 sur ce rose-là.
				// Bordure au repos en muted-foreground : dérivée de --input elle mesurait
				// 1,16:1 sur --background — la case non cochée était invisible (WCAG
				// 1.4.11 exige 3:1 pour un contrôle). Le survol assombrit vers le rose
				// profond, pas vers --ring pastel qui ÉCLAIRCIRAIT la bordure.
				"peer border-muted-foreground data-checked:bg-brand-rose-strong data-checked:text-primary-foreground data-checked:border-brand-rose-strong data-indeterminate:bg-brand-rose-strong data-indeterminate:text-primary-foreground data-indeterminate:border-brand-rose-strong can-hover:hover:border-brand-rose-strong focus-ring aria-invalid:ring-destructive/20 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-[box-shadow,border-color,transform] disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-95",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="flex items-center justify-center text-current transition-none"
			>
				{indeterminate ? <MinusIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
