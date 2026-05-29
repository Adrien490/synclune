/** Semantic slot key — used as the analytics dimension for click tracking. */
type PositionKey = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type VisibilityClass = "hidden md:block";

// Diamond layout: 4 images around central content with varied sizes.
// Mobile (<md) hides all four — the LCP on mobile is ProductCard[0] in the
// LatestCreations section, preloaded via React 19 hoisting from `<Image preload>`.
export const IMAGE_POSITIONS: ReadonlyArray<{
	/** Semantic slot, surfaced to analytics (which emplacement converts). */
	positionKey: PositionKey;
	className: string;
	width: number;
	height: number;
	widthClasses: string;
	sizes: string;
	/** Seconds. Sum with `idleDelay` for CSS `animationDelay` (s) AND multiplied by 1000 for `--enter-delay` (ms). */
	delay: number;
	glowColor: string;
	parallaxSpeed: number;
	parallaxDirection: 1 | -1;
	/** Base rotation injected as `--idle-rotate` into the shared `hero-idle-float` keyframe. */
	idleRotate: string;
	idleDuration: number;
	idleDelay: number;
	visibilityClass: VisibilityClass;
}> = [
	// Top-left — large anchor
	{
		positionKey: "top-left",
		className: "left-[2%] xl:left-[4%] top-[12%]",
		width: 160,
		height: 200,
		widthClasses: "w-32 md:w-36 lg:w-40 xl:w-56 2xl:w-64",
		sizes: "(min-width: 1536px) 256px, (min-width: 1280px) 224px, (min-width: 1024px) 160px, 144px",
		delay: 0.3,
		glowColor: "var(--color-glow-pink)",
		parallaxSpeed: 45,
		parallaxDirection: 1,
		idleRotate: "-8deg",
		idleDuration: 20,
		idleDelay: 0,
		visibilityClass: "hidden md:block",
	},
	// Top-right — medium balance
	{
		positionKey: "top-right",
		className: "right-[3%] xl:right-[5%] top-[8%]",
		width: 128,
		height: 160,
		widthClasses: "w-32 xl:w-48 2xl:w-56",
		sizes: "(min-width: 1536px) 224px, (min-width: 1280px) 192px, 128px",
		delay: 0.5,
		glowColor: "var(--color-glow-lavender)",
		parallaxSpeed: 75,
		parallaxDirection: 1,
		idleRotate: "5deg",
		idleDuration: 22,
		idleDelay: 2,
		visibilityClass: "hidden md:block",
	},
	// Bottom-left — small depth
	{
		positionKey: "bottom-left",
		className: "left-[12%] xl:left-[14%] bottom-[14%]",
		width: 112,
		height: 140,
		widthClasses: "w-28 xl:w-40 2xl:w-48",
		sizes: "(min-width: 1536px) 192px, (min-width: 1280px) 160px, 112px",
		delay: 0.7,
		glowColor: "var(--color-glow-mint)",
		parallaxSpeed: 105,
		parallaxDirection: -1,
		idleRotate: "3deg",
		idleDuration: 18,
		idleDelay: 4,
		visibilityClass: "hidden md:block",
	},
	// Bottom-right — medium balance
	{
		positionKey: "bottom-right",
		className: "right-[10%] xl:right-[12%] bottom-[18%]",
		width: 128,
		height: 160,
		widthClasses: "w-32 md:w-36 lg:w-36 xl:w-44 2xl:w-52",
		sizes: "(min-width: 1536px) 208px, (min-width: 1280px) 176px, (min-width: 1024px) 144px, 136px",
		delay: 0.9,
		glowColor: "var(--color-glow-yellow)",
		parallaxSpeed: 60,
		parallaxDirection: -1,
		idleRotate: "-4deg",
		idleDuration: 24,
		idleDelay: 6,
		visibilityClass: "hidden md:block",
	},
];
