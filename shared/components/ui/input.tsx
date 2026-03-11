import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

const inputVariants = cva(
	cn(
		"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 shadow-xs outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
		"transition-[color,box-shadow,border-color]",
		"hover:border-ring/70",
		"focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px]",
		"aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
	),
	{
		variants: {
			size: {
				default: "min-h-11 text-base md:text-sm",
				sm: "min-h-9 text-sm",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

type InputSize = VariantProps<typeof inputVariants>["size"];

interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
	/** Input size variant */
	size?: InputSize;
	/** Icône affichée au début du champ (élément SVG 16x16) */
	startIcon?: React.ReactNode;
	/** Icône affichée à la fin du champ (élément SVG 16x16). Note : masquée si clearable est actif et le champ a une valeur. */
	endIcon?: React.ReactNode;
	/** Affiche un bouton pour effacer le contenu. Prioritaire sur endIcon quand le champ a une valeur. */
	clearable?: boolean;
	/** Callback appelé lors du clic sur le bouton effacer */
	onClear?: () => void;
}

// Backward-compatible export: default size styles
const inputBaseStyles = inputVariants({ size: "default" });

function Input({
	className,
	type,
	size,
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
				className={cn(inputVariants({ size }), className)}
				{...props}
			/>
		);
	}

	return (
		<div className="relative w-full">
			{hasStartIcon && (
				<div
					className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&>svg]:size-4"
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
					inputVariants({ size }),
					hasStartIcon && "pl-10",
					(hasEndIcon || clearable) && "pr-10",
					className,
				)}
				{...props}
			/>

			{(showClearButton ?? hasEndIcon) && (
				<div className="absolute top-1/2 right-3 -translate-y-1/2">
					{showClearButton ? (
						<button
							type="button"
							onClick={onClear}
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-2 flex size-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
							aria-label="Effacer le champ"
						>
							<X className="size-4" aria-hidden="true" />
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

export { Input, inputBaseStyles, inputVariants };
export type { InputProps };
