"use client";

import { useSyncExternalStore } from "react";

import { Kbd } from "@/shared/components/ui/kbd";
import { cn } from "@/shared/utils/cn";

const subscribeStatic = () => () => {
	/* userAgent doesn't change during a page lifetime */
};
const getMacSnapshot = () => /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
const getServerSnapshot = () => false;

interface ShortcutKbdProps {
	keyLabel: string;
	className?: string;
}

/**
 * Renders the platform-correct keyboard hint (⌘ on Mac, Ctrl elsewhere).
 * Matches the accelerator listened to via `e.metaKey || e.ctrlKey`.
 *
 * Safe to mount inside Radix TooltipContent / portals: the content is rendered
 * after open=true, by which time the platform has been detected client-side.
 */
export function ShortcutKbd({ keyLabel, className }: ShortcutKbdProps) {
	const isMac = useSyncExternalStore(subscribeStatic, getMacSnapshot, getServerSnapshot);

	return (
		<Kbd
			className={cn(
				"border-border/60 bg-muted/60 gap-0.5 rounded border px-1.5 font-mono text-[0.6875rem]",
				className,
			)}
		>
			<span aria-hidden="true">{isMac ? "⌘" : "Ctrl"}</span>
			<span>{keyLabel}</span>
		</Kbd>
	);
}
