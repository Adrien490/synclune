"use client";

import { cn } from "@/shared/utils/cn";

interface AnnouncementPreviewProps {
	message: string;
	linkText?: string | null;
}

/**
 * Live preview of the announcement bar in the form dialog.
 * Shows a simplified visual representation of how the announcement will look.
 */
export function AnnouncementPreview({ message, linkText }: AnnouncementPreviewProps) {
	if (!message) return null;

	return (
		<div className="space-y-2">
			<p className="text-muted-foreground text-sm font-medium">Aperçu</p>
			<div
				className={cn(
					"bg-primary text-primary-foreground",
					"flex items-center justify-center gap-2 rounded-md px-4 py-2.5",
					"text-center text-sm font-medium tracking-wide",
				)}
			>
				<span aria-hidden="true">&#10022;</span>
				<span className="line-clamp-1">{message}</span>
				{linkText && (
					<>
						<span aria-hidden="true" className="text-primary-foreground/50">
							&middot;
						</span>
						<span className="font-semibold underline underline-offset-2">{linkText}</span>
					</>
				)}
				<span aria-hidden="true">&#10022;</span>
			</div>
		</div>
	);
}
