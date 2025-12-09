"use client";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/utils/cn";
import { ReactNode } from "react";

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
				"flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-lg cursor-pointer min-h-[44px]",
				"transition-colors duration-150",
				"hover:bg-accent/50",
				"focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
				checked && "bg-primary/5"
			)}
		>
			<Checkbox
				id={id}
				checked={checked}
				onCheckedChange={onCheckedChange}
				className="mt-0.5 shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
			/>
			<div className="flex-1 min-w-0 flex items-center gap-2">
				{indicator && (
					<span className="shrink-0" aria-hidden="true">
						{indicator}
					</span>
				)}
				<div className="flex-1 min-w-0">
					<span className="text-sm font-normal">{children}</span>
					{description && (
						<span className="block text-xs text-muted-foreground mt-0.5">
							{description}
						</span>
					)}
				</div>
				{count !== undefined && (
					<span className="text-xs text-muted-foreground shrink-0">
						({count})
					</span>
				)}
			</div>
		</label>
	);
}
