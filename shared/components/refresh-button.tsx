"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
	onRefresh: () => void;
	isPending: boolean;
	label?: string;
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
	hideOnMobile?: boolean;
}

export function RefreshButton({
	onRefresh,
	isPending,
	label = "Rafraîchir",
	className,
	variant = "outline",
	hideOnMobile = true,
}: RefreshButtonProps) {
	const button = (
		<Button
			variant={variant}
			size="icon"
			onClick={onRefresh}
			disabled={isPending}
			className={cn(
				"h-11 w-11 border-border/60 hover:border-border hover:bg-accent/30 transition-all duration-200",
				className
			)}
			aria-label={label}
		>
			<RefreshCw
				className={cn("h-4 w-4", isPending && "animate-spin")}
				aria-hidden="true"
			/>
		</Button>
	);

	const content = (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent>
				<p>{label}</p>
			</TooltipContent>
		</Tooltip>
	);

	if (hideOnMobile) {
		return <div className="hidden md:block">{content}</div>;
	}

	return content;
}
