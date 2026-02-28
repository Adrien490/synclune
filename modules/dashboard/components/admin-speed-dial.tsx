"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { MessageSquare } from "lucide-react";

interface AdminSpeedDialProps {
	email: string;
}

/**
 * Bouton flottant mailto pour contacter Adrien
 */
export function AdminSpeedDial({ email }: AdminSpeedDialProps) {
	return (
		<div className="fixed right-6 bottom-6 z-45 hidden md:block">
			<Tooltip>
				<TooltipTrigger asChild>
					<a
						href={`mailto:${email}`}
						className={cn(
							"flex items-center justify-center",
							"size-14 rounded-full",
							"bg-primary text-primary-foreground",
							"can-hover:hover:shadow-xl can-hover:hover:shadow-primary/25 shadow-lg",
							"hover:bg-primary/90",
							"transition-all active:scale-95",
						)}
						aria-label="Envoyer un email à Adrien"
					>
						<MessageSquare className="size-6" aria-hidden="true" />
					</a>
				</TooltipTrigger>
				<TooltipContent side="left" sideOffset={12}>
					<p className="font-medium">Contacter Adri</p>
					<p className="text-muted-foreground text-xs">Bug, feature ou question</p>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
