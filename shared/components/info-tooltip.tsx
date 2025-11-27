"use client";

import { HelpCircle } from "lucide-react";
import * as React from "react";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";

interface InfoTooltipProps {
	children: React.ReactNode;
	side?: "top" | "right" | "bottom" | "left";
	className?: string;
}

/**
 * InfoTooltip - Composant d'aide contextuelle
 *
 * Affiche une icône d'aide (?) qui révèle un tooltip informatif au survol.
 * Utilisé pour expliquer des concepts complexes ou fournir des informations supplémentaires.
 *
 * @example
 * <InfoTooltip>
 *   Ceci est une explication contextuelle
 * </InfoTooltip>
 */
export function InfoTooltip({
	children,
	side = "top",
	className,
}: InfoTooltipProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className="inline-flex items-center justify-center ml-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
					aria-label="Aide contextuelle"
				>
					<HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
				</button>
			</TooltipTrigger>
			<TooltipContent side={side} className={className}>
				<div className="max-w-xs text-sm">{children}</div>
			</TooltipContent>
		</Tooltip>
	);
}
