"use client";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/utils/cn";
import { type ReactNode } from "react";

interface CheckboxFilterItemProps {
	id: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	children: ReactNode;
	description?: string;
	/**
	 * Indicateur visuel optionnel (ex: pastille de couleur, icone)
	 */
	indicator?: ReactNode;
	/**
	 * Compteur optionnel (ex: nombre de produits)
	 */
	count?: number;
}

/**
 * Composant checkbox avec zone de touch etendue (44px min) pour les filtres.
 * Conforme WCAG pour l'accessibilite mobile.
 */
export function CheckboxFilterItem({
	id,
	checked,
	onCheckedChange,
	children,
	description,
	indicator,
	count,
}: CheckboxFilterItemProps) {
	return (
		<label
			htmlFor={id}
			className={cn(
				"-mx-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5",
				"transition-colors duration-150",
				"hover:bg-accent/50",
				"focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
				checked && "bg-primary/5",
			)}
		>
			<Checkbox
				id={id}
				checked={checked}
				onCheckedChange={onCheckedChange}
				className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5 shrink-0"
			/>
			<div className="flex min-w-0 flex-1 items-center gap-2">
				{indicator && (
					<span className="shrink-0" aria-hidden="true">
						{indicator}
					</span>
				)}
				<div className="min-w-0 flex-1">
					<span className="text-sm font-normal">{children}</span>
					{description && (
						<span className="text-muted-foreground mt-0.5 block text-xs">{description}</span>
					)}
				</div>
				{count !== undefined && (
					<span className="text-muted-foreground shrink-0 text-xs">({count})</span>
				)}
			</div>
		</label>
	);
}
