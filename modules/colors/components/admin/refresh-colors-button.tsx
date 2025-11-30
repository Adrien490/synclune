"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useRefreshColors } from "@/modules/colors/hooks/use-refresh-colors";
import { cn } from "@/shared/utils/cn";
import { RefreshCw } from "lucide-react";

interface RefreshColorsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshColorsButton({
	className,
	variant = "outline",
}: RefreshColorsButtonProps) {
	const { refresh, isPending } = useRefreshColors();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant={variant}
					size="icon"
					onClick={refresh}
					disabled={isPending}
					className={cn(
						"h-11 w-11 border-border/60 hover:border-border hover:bg-accent/30 transition-all duration-200",
						className
					)}
					aria-label="Rafraîchir couleurs"
				>
					<RefreshCw
						className={cn("h-4 w-4", isPending && "animate-spin")}
						aria-hidden="true"
					/>
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>Rafraîchir couleurs</p>
			</TooltipContent>
		</Tooltip>
	);
}
