"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useRefreshPayments } from "@/modules/payments/hooks/use-refresh-payments";
import { cn } from "@/shared/utils/cn";
import { RefreshCw } from "lucide-react";

interface RefreshPaymentsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshPaymentsButton({
	className,
	variant = "outline",
}: RefreshPaymentsButtonProps) {
	const { refresh, isPending } = useRefreshPayments();

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
					aria-label="Rafraîchir paiements"
				>
					<RefreshCw
						className={cn("h-4 w-4", isPending && "animate-spin")}
						aria-hidden="true"
					/>
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>Rafraîchir paiements</p>
			</TooltipContent>
		</Tooltip>
	);
}
