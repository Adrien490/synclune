"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useRefreshUsers } from "@/modules/users/hooks/use-refresh-users";
import { cn } from "@/shared/utils/cn";
import { RefreshCw } from "lucide-react";

interface RefreshUsersButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshUsersButton({
	className,
	variant = "outline",
}: RefreshUsersButtonProps) {
	const { refresh, isPending } = useRefreshUsers();

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
						aria-label="Rafraîchir utilisateurs"
					>
						<RefreshCw
							className={cn("h-4 w-4", isPending && "animate-spin")}
							aria-hidden="true"
						/>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Rafraîchir utilisateurs</p>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
