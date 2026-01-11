"use client";

import { cn } from "@/shared/utils/cn";
import { ReactNode } from "react";

interface RadioFilterItemProps {
	id: string;
	name: string;
	value: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	children: ReactNode;
	description?: string;
}

/**
 * Composant radio avec zone de touch etendue (44px min) pour les filtres.
 * Utilise la semantique correcte pour les selections uniques (radio button).
 * Conforme WCAG pour l'accessibilite mobile.
 */
export function RadioFilterItem({
	id,
	name,
	value,
	checked,
	onCheckedChange,
	children,
	description,
}: RadioFilterItemProps) {
	return (
		<label
			htmlFor={id}
			className={cn(
				"flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-lg cursor-pointer min-h-11",
				"transition-colors duration-150",
				"hover:bg-accent/50",
				"focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
				checked && "bg-primary/5"
			)}
		>
			<input
				type="radio"
				id={id}
				name={name}
				value={value}
				checked={checked}
				onChange={(e) => onCheckedChange(e.target.checked)}
				className={cn(
					"mt-0.5 shrink-0 size-4 rounded-full border border-primary text-primary",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"accent-primary"
				)}
			/>
			<div className="flex-1 min-w-0">
				<span className="text-sm font-normal">{children}</span>
				{description && (
					<span className="block text-xs text-muted-foreground mt-0.5">
						{description}
					</span>
				)}
			</div>
		</label>
	);
}
