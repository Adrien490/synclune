"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
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
		<div className="hidden md:block fixed z-45 bottom-6 right-6">
			<Tooltip>
				<TooltipTrigger asChild>
					<a
						href={`mailto:${email}`}
						className={cn(
							"flex items-center justify-center",
							"size-14 rounded-full",
							"bg-primary text-primary-foreground",
							"shadow-lg hover:shadow-xl hover:shadow-primary/25",
							"hover:bg-primary/90",
							"active:scale-95 transition-all"
						)}
						aria-label="Envoyer un email à Adrien"
					>
						<MessageSquare className="size-6" aria-hidden="true" />
					</a>
				</TooltipTrigger>
				<TooltipContent side="left" sideOffset={12}>
					<p className="font-medium">Contacter Adri</p>
					<p className="text-xs text-muted-foreground">
						Bug, feature ou question
					</p>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
