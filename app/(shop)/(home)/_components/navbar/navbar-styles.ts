import { cn } from "@/shared/utils/cn";

/** Shared base classes for icon buttons in the navbar (desktop + mobile trigger) */
export const iconButtonClassName = cn(
	"relative items-center justify-center size-11 rounded-xl group",
	"text-muted-foreground can-hover:hover:bg-accent can-hover:hover:text-accent-foreground",
	"ease-out motion-safe:transition-[transform,color,background-color] motion-safe:duration-[var(--duration-slow)]",
	"motion-safe:can-hover:hover:scale-105 motion-safe:active:scale-95",
	"focus-ring",
);

/**
 * Approximate Vaul exit-slide animation duration. Used as a safety fallback
 * when deferring follow-up overlays (logout dialog) or focus management until
 * after the sheet has finished closing. Source: Vaul defaults (~300ms) + margin.
 */
export const VAUL_EXIT_DURATION_MS = 450;
