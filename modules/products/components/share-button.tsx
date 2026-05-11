"use client";

import { Check, Copy, Mail, Share2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

interface ShareData {
	title: string;
	text?: string;
	url: string;
}

function subscribeNoop(_callback: () => void) {
	return () => {};
}

function getCanShareSnapshot() {
	return "share" in navigator;
}

function getCanShareServerSnapshot() {
	return false;
}

interface ShareButtonProps {
	title: string;
	text?: string;
	url: string;
	size?: "sm" | "lg";
	className?: string;
	/** Optional absolute image URL used by Pinterest (otherwise og:image is scraped) */
	media?: string;
}

const PINTEREST_LOGO_PATH =
	// Simple Pinterest mark (24×24). Keeps bundle tiny vs importing react-icons.
	"M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.406.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.358-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z";

function buildAbsoluteUrl(url: string): string {
	if (typeof window === "undefined") return url;
	try {
		return new URL(url, window.location.origin).href;
	} catch {
		return url;
	}
}

/**
 * Share button using Web Share API with a rich fallback menu (desktop browsers).
 *
 * - If Web Share API is available (mobile Safari, most mobile browsers): opens the native share sheet.
 * - If unavailable (desktop Safari, desktop Firefox): opens a dropdown with Pinterest, email, and copy link.
 */
export function ShareButton({ title, text, url, size = "lg", className, media }: ShareButtonProps) {
	const canShare = useSyncExternalStore(
		subscribeNoop,
		getCanShareSnapshot,
		getCanShareServerSnapshot,
	);

	async function share(data: ShareData): Promise<"shared" | "copied" | "dismissed"> {
		// Validate URL early — navigator.share() rejects silently on malformed URLs,
		// which then falls back to clipboard and writes garbage data.
		try {
			new URL(data.url);
		} catch {
			return "dismissed";
		}

		if (canShare) {
			try {
				await navigator.share(data);
				return "shared";
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return "dismissed";
				}
				// Fallback to clipboard on other errors
			}
		}

		try {
			await navigator.clipboard.writeText(data.url);
			return "copied";
		} catch {
			return "dismissed";
		}
	}

	const [feedback, setFeedback] = useState<"shared" | "copied" | null>(null);
	const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
		};
	}, []);

	function scheduleFeedbackClear() {
		if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
		feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 2000);
	}

	const iconSize = size === "sm" ? 16 : 20;

	async function handleNativeShare() {
		const fullUrl = buildAbsoluteUrl(url);
		const result = await share({ title, text, url: fullUrl });

		if (result === "shared" || result === "copied") {
			triggerHaptic("success");
			setFeedback(result);
			scheduleFeedbackClear();
		}
	}

	async function handleCopy() {
		const fullUrl = buildAbsoluteUrl(url);
		try {
			await navigator.clipboard.writeText(fullUrl);
			triggerHaptic("success");
			setFeedback("copied");
			scheduleFeedbackClear();
		} catch {
			// swallow; no toast infra wired here
		}
	}

	const FeedbackIcon = feedback === "copied" ? Copy : feedback === "shared" ? Check : null;

	const buttonClassName = cn(
		"relative inline-flex items-center justify-center rounded-xl transition-[transform,color,background-color] duration-300 ease-out",
		"text-muted-foreground hover:bg-accent hover:text-accent-foreground",
		"motion-safe:hover:scale-105 motion-safe:active:scale-95",
		"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
		size === "sm" ? "size-9" : "size-11",
		className,
	);

	const buttonContent = FeedbackIcon ? (
		<FeedbackIcon size={iconSize} className="text-primary" aria-hidden="true" />
	) : (
		<Share2
			size={iconSize}
			className="transition-transform duration-300 ease-out group-hover:scale-105"
			aria-hidden="true"
		/>
	);

	const ariaLabel = feedback === "copied" ? "Lien copié" : "Partager";

	// Native Web Share path (mobile browsers) — single button.
	if (canShare) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={handleNativeShare}
						aria-label={ariaLabel}
						className={buttonClassName}
					>
						{buttonContent}
					</button>
				</TooltipTrigger>
				<TooltipContent className="hidden sm:block">
					{feedback === "copied" ? "Lien copié !" : "Partager"}
				</TooltipContent>
			</Tooltip>
		);
	}

	// Desktop fallback — dropdown menu with Pinterest / email / copy link.
	const fullUrl = buildAbsoluteUrl(url);
	const encodedUrl = encodeURIComponent(fullUrl);
	const encodedTitle = encodeURIComponent(title);
	const encodedText = encodeURIComponent(text ?? title);
	const encodedMedia = media ? encodeURIComponent(media) : "";

	const pinterestHref = `https://pinterest.com/pin/create/button/?url=${encodedUrl}${encodedMedia ? `&media=${encodedMedia}` : ""}&description=${encodedTitle}`;
	const mailtoHref = `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					className={buttonClassName}
					data-testid="share-button-trigger"
				>
					{buttonContent}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56">
				<DropdownMenuItem asChild>
					<a
						href={pinterestHref}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => triggerHaptic("selection")}
					>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
							<path d={PINTEREST_LOGO_PATH} />
						</svg>
						Épingler sur Pinterest
					</a>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<a href={mailtoHref} onClick={() => triggerHaptic("selection")}>
						<Mail className="size-4" aria-hidden="true" />
						Envoyer par e-mail
					</a>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={handleCopy}>
					<Copy className="size-4" aria-hidden="true" />
					Copier le lien
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
