"use client";

import { HelpCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
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
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-auto w-auto p-0 ml-1.5 rounded-full hover:bg-transparent"
					aria-label="Aide contextuelle"
				>
					<HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
				</Button>
			</TooltipTrigger>
			<TooltipContent side={side} className={className}>
				<div className="max-w-xs text-sm">{children}</div>
			</TooltipContent>
		</Tooltip>
	);
}
