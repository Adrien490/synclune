"use client";

import { useHaptic } from "@/shared/hooks/use-haptic";
import type { HapticPattern } from "@/shared/hooks/use-haptic";
import type { PointerEvent, ReactNode } from "react";

const PATTERN_BY_TARGET: Record<string, HapticPattern> = {
	cta: "light",
	polaroid: "light",
};

export function AtelierHapticBridge({ children }: { children: ReactNode }) {
	const haptic = useHaptic();

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement | null;
		const match = target?.closest<HTMLElement>("[data-atelier-haptic]");
		if (!match) return;
		const pattern = PATTERN_BY_TARGET[match.dataset.atelierHaptic ?? ""];
		if (!pattern) return;
		haptic(pattern);
	};

	return (
		<div onPointerDown={onPointerDown} className="contents">
			{children}
		</div>
	);
}
