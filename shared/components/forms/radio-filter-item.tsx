"use client";

import { cn } from "@/shared/utils/cn";
import { type ReactNode } from "react";

interface RadioFilterItemProps {
	id: string;
	name: string;
	value: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	children: ReactNode;
	description?: string;
	disabled?: boolean;
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
	disabled,
}: RadioFilterItemProps) {
	return (
		<label
			htmlFor={id}
			className={cn(
				"-mx-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5",
				"transition-colors duration-150",
				"hover:bg-accent/50",
				"focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
				checked && "bg-primary/5",
				disabled && "cursor-not-allowed opacity-50",
			)}
		>
			<input
				type="radio"
				id={id}
				name={name}
				value={value}
				checked={checked}
				disabled={disabled}
				onChange={(e) => onCheckedChange(e.target.checked)}
				className={cn(
					"border-primary text-primary mt-0.5 size-4 shrink-0 rounded-full border",
					"focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"accent-primary",
				)}
			/>
			<div className="min-w-0 flex-1">
				<span className="text-sm font-normal">{children}</span>
				{description && (
					<span className="text-muted-foreground mt-0.5 block text-xs">{description}</span>
				)}
			</div>
		</label>
	);
}
