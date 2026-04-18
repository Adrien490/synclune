"use client";

import type { PointerEvent, ReactNode } from "react";

import { useHaptic } from "@/shared/hooks/use-haptic";
import type { HapticPattern } from "@/shared/hooks/use-haptic";

const PATTERN_BY_TARGET: Record<string, HapticPattern> = {
	card: "light",
};

export function LatestCreationsHapticBridge({ children }: { children: ReactNode }) {
	const haptic = useHaptic();

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement | null;
		const match = target?.closest<HTMLElement>("[data-latest-haptic]");
		if (!match) return;
		const pattern = PATTERN_BY_TARGET[match.dataset.latestHaptic ?? ""];
		if (!pattern) return;
		haptic(pattern);
	};

	return (
		<div onPointerDown={onPointerDown} className="contents">
			{children}
		</div>
	);
}
