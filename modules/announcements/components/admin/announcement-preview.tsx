"use client";

import { X } from "lucide-react";

import { COUNTDOWN_DISPLAY_THRESHOLD_MS } from "../announcement-bar/announcement-bar.constants";
import { useCountdown } from "../announcement-bar/use-countdown";
import { cn } from "@/shared/utils/cn";

interface AnnouncementPreviewProps {
	message: string;
	link?: string | null;
	linkText?: string | null;
	endsAt?: Date | string | null;
}

/**
 * Live WYSIWYG preview of the announcement bar in the admin form.
 * Mirrors the production storefront rendering: shimmer sweep, fake close
 * button, separator, optional countdown pill when endsAt is within 24h.
 */
export function AnnouncementPreview({
	message,
	link,
	linkText,
	endsAt = null,
}: AnnouncementPreviewProps) {
	const countdown = useCountdown(endsAt ?? null, COUNTDOWN_DISPLAY_THRESHOLD_MS);

	if (!message) return null;

	const showSeparator = Boolean(linkText) || Boolean(link);

	return (
		<div className="space-y-2">
			<p className="text-muted-foreground text-sm font-medium">Aperçu storefront</p>
			<div
				className={cn(
					"relative isolate w-full overflow-hidden rounded-md",
					"bg-primary text-primary-foreground",
					"flex items-center justify-center",
					"text-center text-sm font-medium tracking-wide",
					"h-11 sm:h-9",
					"px-10",
				)}
			>
				<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute inset-0 animate-[announcement-shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent motion-reduce:hidden" />
				</div>

				<div className="relative flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0">
					<span className="line-clamp-1">{message}</span>
					{showSeparator && (
						<>
							<span aria-hidden="true" className="text-primary-foreground/50">
								&middot;
							</span>
							<span className="font-semibold underline underline-offset-2">
								{linkText ?? link ?? ""}
							</span>
						</>
					)}
				</div>

				{countdown ? (
					<span
						aria-hidden="true"
						className={cn(
							"absolute top-1/2 right-10 hidden -translate-y-1/2 items-center rounded-full px-2 py-0.5 sm:right-12",
							"bg-primary-foreground/20 text-primary-foreground",
							"font-mono text-[11px] font-semibold tracking-wider tabular-nums",
							"xs:inline-flex",
						)}
					>
						{countdown.label}
					</span>
				) : null}

				<button
					type="button"
					tabIndex={-1}
					aria-hidden="true"
					disabled
					className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full opacity-80 sm:right-2"
				>
					<X size={14} aria-hidden="true" />
				</button>
			</div>
			{link && !linkText ? (
				<p className="text-destructive text-xs">Texte du lien requis quand un lien est spécifié</p>
			) : null}
		</div>
	);
}
