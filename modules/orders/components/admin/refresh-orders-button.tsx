"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useRefreshOrders } from "@/modules/orders/hooks/use-refresh-orders";
import { cn } from "@/shared/utils/cn";
import { RefreshCw } from "lucide-react";

interface RefreshOrdersButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshOrdersButton({
	className,
	variant = "outline",
}: RefreshOrdersButtonProps) {
	const { refresh, isPending } = useRefreshOrders();

	return (
		<div className="hidden md:block">
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
						aria-label="Rafraîchir commandes"
					>
						<RefreshCw
							className={cn("h-4 w-4", isPending && "animate-spin")}
							aria-hidden="true"
						/>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Rafraîchir commandes</p>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
