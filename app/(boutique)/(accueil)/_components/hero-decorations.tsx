"use client";

import dynamic from "next/dynamic";

export const ParticleBackground = dynamic(() =>
	import("@/shared/components/animations/particle-background").then(
		(mod) => mod.ParticleBackground,
	),
);

export const ScrollIndicator = dynamic(() =>
	import("@/shared/components/animations/scroll-indicator").then((mod) => mod.ScrollIndicator),
);
