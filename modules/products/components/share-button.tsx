"use client";

import { useWebShare } from "@/shared/hooks/use-web-share";
import { cn } from "@/shared/utils/cn";
import { Share2, Check, Copy } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

interface ShareButtonProps {
	title: string;
	text?: string;
	url: string;
	size?: "sm" | "lg";
	className?: string;
}

/**
 * Share button using Web Share API with clipboard fallback.
 * Shows a brief feedback icon after sharing/copying.
 */
export function ShareButton({ title, text, url, size = "lg", className }: ShareButtonProps) {
	const { share } = useWebShare();
	const [feedback, setFeedback] = useState<"shared" | "copied" | null>(null);

	async function handleShare() {
		const fullUrl = typeof window !== "undefined" ? new URL(url, window.location.origin).href : url;
		const result = await share({ title, text, url: fullUrl });

		if (result === "shared" || result === "copied") {
			setFeedback(result);
			setTimeout(() => setFeedback(null), 2000);
		}
	}

	const iconSize = size === "sm" ? 16 : 20;

	const FeedbackIcon = feedback === "copied" ? Copy : feedback === "shared" ? Check : null;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={handleShare}
					aria-label={feedback === "copied" ? "Lien copié" : "Partager"}
					className={cn(
						"relative inline-flex items-center justify-center rounded-xl transition-[transform,color,background-color] duration-300 ease-out",
						"text-muted-foreground hover:bg-accent hover:text-accent-foreground",
						"motion-safe:hover:scale-105 motion-safe:active:scale-95",
						"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
						size === "sm" ? "size-9" : "size-11",
						className,
					)}
				>
					{FeedbackIcon ? (
						<FeedbackIcon size={iconSize} className="text-primary" aria-hidden="true" />
					) : (
						<Share2
							size={iconSize}
							className="transition-transform duration-300 ease-out group-hover:scale-105"
							aria-hidden="true"
						/>
					)}
				</button>
			</TooltipTrigger>
			<TooltipContent className="hidden sm:block">
				{feedback === "copied" ? "Lien copié !" : "Partager"}
			</TooltipContent>
		</Tooltip>
	);
}
