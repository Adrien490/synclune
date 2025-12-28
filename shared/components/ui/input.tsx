import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/shared/utils/cn";

interface InputProps extends React.ComponentProps<"input"> {
	/** Icône affichée au début du champ (élément SVG 16x16) */
	startIcon?: React.ReactNode;
	/** Icône affichée à la fin du champ (élément SVG 16x16). Note : masquée si clearable est actif et le champ a une valeur. */
	endIcon?: React.ReactNode;
	/** Affiche un bouton pour effacer le contenu. Prioritaire sur endIcon quand le champ a une valeur. */
	clearable?: boolean;
	/** Callback appelé lors du clic sur le bouton effacer */
	onClear?: () => void;
}

// Styles de base de l'input (exportés pour réutilisation)
const inputBaseStyles = cn(
	"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input min-h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
	"transition-[color,box-shadow,border-color]",
	"hover:border-ring/70",
	"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
	"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
);

function Input({
	className,
	type,
	startIcon,
	endIcon,
	clearable,
	onClear,
	value,
	...props
}: InputProps) {
	const hasStartIcon = !!startIcon;
	const hasEndIcon = !!endIcon;
	const showClearButton = clearable && value && String(value).length > 0;

	// Si pas d'icônes ni de clear button, retourner l'input simple
	if (!hasStartIcon && !hasEndIcon && !clearable) {
		return (
			<input
				type={type}
				data-slot="input"
				value={value}
				className={cn(inputBaseStyles, className)}
				{...props}
			/>
		);
	}

	return (
		<div className="relative w-full">
			{/* Icône de début */}
			{hasStartIcon && (
				<div
					className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 [&>svg]:size-4"
					aria-hidden="true"
				>
					{startIcon}
				</div>
			)}

			<input
				type={type}
				data-slot="input"
				value={value}
				className={cn(
					inputBaseStyles,
					hasStartIcon && "pl-10",
					(hasEndIcon || clearable) && "pr-10",
					className
				)}
				{...props}
			/>

			{/* Bouton effacer ou icône de fin */}
			{(showClearButton || hasEndIcon) && (
				<div className="absolute right-3 top-1/2 -translate-y-1/2">
					{showClearButton ? (
						<button
							type="button"
							onClick={onClear}
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-2 flex size-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2"
							aria-label="Effacer le champ"
						>
							<X className="size-4" />
						</button>
					) : hasEndIcon ? (
						<div className="[&>svg]:size-4" aria-hidden="true">
							{endIcon}
						</div>
					) : null}
				</div>
			)}
		</div>
	);
}

export { Input, inputBaseStyles };
export type { InputProps };
