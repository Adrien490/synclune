"use client";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { CircleHelp } from "lucide-react";

interface FieldLabelProps {
	/**
	 * `id` posé sur le `<Label>` lui-même (pas le conteneur) — permet à un contrôle
	 * non natif (trigger Radix Select / Popover) de s'y rattacher via
	 * `aria-labelledby` quand `htmlFor` cible déjà la variante mobile du champ.
	 */
	id?: string;
	htmlFor?: string;
	children: React.ReactNode;
	required?: boolean;
	optional?: boolean;
	tooltip?: React.ReactNode;
	className?: string;
}

export function FieldLabel({
	id,
	htmlFor,
	children,
	required = false,
	optional = false,
	tooltip,
	className,
}: FieldLabelProps) {
	return (
		<div className="flex items-center gap-2">
			<Label id={id} htmlFor={htmlFor} className={cn("text-sm font-medium", className)}>
				{children}
				{required && (
					<span className="text-destructive ml-1" aria-hidden="true">
						*
					</span>
				)}
				{optional && !required && (
					<span className="text-muted-foreground ml-2 text-xs font-normal">(Optionnel)</span>
				)}
			</Label>
			{tooltip && (
				<TooltipProvider delay={200}>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="text-muted-foreground hover:text-foreground h-auto w-auto p-0 hover:bg-transparent"
									aria-label="Plus d'informations"
								/>
							}
						>
							<CircleHelp className="size-3.5" />
						</TooltipTrigger>
						<TooltipContent side="right" className="max-w-xs">
							{tooltip}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</div>
	);
}
