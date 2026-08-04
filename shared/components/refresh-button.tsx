"use client";

import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ssr";

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
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant={variant}
						size="icon"
						onClick={onRefresh}
						disabled={isPending}
						className={cn(
							"border-border/60 hover:border-border hover:bg-accent/30 size-11 transition-all duration-200",
							hideOnMobile && "hidden md:flex",
							className,
						)}
						aria-label={label}
					/>
				}
			>
				<ArrowsClockwiseIcon
					className={cn("size-4", isPending && "motion-safe:animate-spin")}
					aria-hidden="true"
				/>
			</TooltipTrigger>
			<TooltipContent>
				<p>{label}</p>
			</TooltipContent>
		</Tooltip>
	);
}
