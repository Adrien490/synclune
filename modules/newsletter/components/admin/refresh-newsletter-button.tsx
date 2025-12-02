"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useRefreshNewsletter } from "@/modules/newsletter/hooks/use-refresh-newsletter";
import { cn } from "@/shared/utils/cn";
import { RefreshCw } from "lucide-react";

interface RefreshNewsletterButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshNewsletterButton({
	className,
	variant = "outline",
}: RefreshNewsletterButtonProps) {
	const { refresh, isPending } = useRefreshNewsletter();

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
						aria-label="Rafraîchir newsletter"
					>
						<RefreshCw
							className={cn("h-4 w-4", isPending && "animate-spin")}
							aria-hidden="true"
						/>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Rafraîchir newsletter</p>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
