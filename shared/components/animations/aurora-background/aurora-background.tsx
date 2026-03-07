"use client";

import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import { useInView, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AURORA_PALETTES, DEFAULT_AURORA_COLORS, MAX_RIBBONS } from "./constants";
import { AuroraRibbonSet } from "./aurora-ribbon-set";
import type { AuroraBackgroundProps } from "./types";
import { generateRibbons } from "./utils";

/** Max parallax offset in pixels for the closest ribbons */
const PARALLAX_STRENGTH = 15;

/** Duration in ms for the parallax lerp-to-zero reset */
const LERP_RESET_DURATION = 600;

function AuroraBackgroundInner({
	count = 5,
	width = [300, 600],
	height = [100, 300],
	opacity = [0.15, 0.35],
	blur = [40, 80],
	colors,
	palette,
	intensity = "medium",
	blendMode = "screen",
	speed = 1,
	className,
	scrollFade = false,
	interactive = false,
}: AuroraBackgroundProps) {
	const safeCount = Math.min(count, MAX_RIBBONS);
	const containerRef = useRef<HTMLDivElement>(null);
	const reducedMotion = useReducedMotion();
	const viewportInView = useInView(containerRef, { margin: "-100px" });
	const isTouchDevice = useIsTouchDevice();
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const [tabVisible, setTabVisible] = useState(true);
	const highContrast = useMediaQuery("(prefers-contrast: more)");

	useEffect(() => {
		function onVisibilityChange() {
			setTabVisible(document.visibilityState === "visible");
		}
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => document.removeEventListener("visibilitychange", onVisibilityChange);
	}, []);

	const isInView = viewportInView && tabVisible;

	// Scroll-linked opacity
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start end", "end start"],
	});
	const scrollOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

	// Mouse parallax
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);
	const cursorX = useMotionValue(0.5);
	const cursorY = useMotionValue(0.5);

	// Skip mouse listeners on touch devices
	useEffect(() => {
		if (isTouchDevice) return;
		const el = containerRef.current;
		if (!el) return;

		let lerpRafId: number | null = null;
		let cachedRect = el.getBoundingClientRect();
		let rectStale = false;

		const ro = new ResizeObserver(() => {
			rectStale = true;
		});
		ro.observe(el);

		function markRectStale() {
			rectStale = true;
		}

		function cancelLerp() {
			if (lerpRafId !== null) {
				cancelAnimationFrame(lerpRafId);
				lerpRafId = null;
			}
		}

		const onMouseMove = (e: MouseEvent) => {
			if (rectStale) {
				cachedRect = el.getBoundingClientRect();
				rectStale = false;
			}
			cancelLerp();
			const normX = (e.clientX - cachedRect.left) / cachedRect.width;
			const normY = (e.clientY - cachedRect.top) / cachedRect.height;
			mouseX.set((normX - 0.5) * 2 * PARALLAX_STRENGTH);
			mouseY.set((normY - 0.5) * 2 * PARALLAX_STRENGTH);
			cursorX.set(normX);
			cursorY.set(normY);
		};

		function onMouseLeave() {
			cancelLerp();
			const startX = mouseX.get();
			const startY = mouseY.get();
			const startCursorX = cursorX.get();
			const startCursorY = cursorY.get();
			const start = performance.now();

			function step(now: number) {
				const t = Math.min((now - start) / LERP_RESET_DURATION, 1);
				const ease = 1 - (1 - t) * (1 - t); // easeOutQuad
				mouseX.set(startX * (1 - ease));
				mouseY.set(startY * (1 - ease));
				cursorX.set(startCursorX + (0.5 - startCursorX) * ease);
				cursorY.set(startCursorY + (0.5 - startCursorY) * ease);
				if (t < 1) {
					lerpRafId = requestAnimationFrame(step);
				} else {
					lerpRafId = null;
				}
			}
			lerpRafId = requestAnimationFrame(step);
		}

		el.addEventListener("mousemove", onMouseMove, { passive: true });
		el.addEventListener("mouseleave", onMouseLeave, { passive: true });
		window.addEventListener("scroll", markRectStale, { passive: true });
		return () => {
			cancelLerp();
			ro.disconnect();
			el.removeEventListener("mousemove", onMouseMove);
			el.removeEventListener("mouseleave", onMouseLeave);
			window.removeEventListener("scroll", markRectStale);
		};
	}, [mouseX, mouseY, cursorX, cursorY, isTouchDevice]);

	// Resolve colors: explicit colors > palette > default
	const resolvedColors = colors ?? (palette ? AURORA_PALETTES[palette] : DEFAULT_AURORA_COLORS);

	// Speed multiplier
	const safeSpeed = Math.max(speed, 0.01);
	const desktopDuration = 25 / safeSpeed;
	const mobileDuration = 18 / safeSpeed;

	// Mobile adjustments: reduce count, blur, width
	const mobileWidth: [number, number] = [width[0] * 0.7, width[1] * 0.7];
	const mobileBlur: [number, number] = [blur[0] * 0.6, blur[1] * 0.6];

	const ribbons = isDesktop
		? generateRibbons(safeCount, width, height, opacity, blur, resolvedColors, desktopDuration)
		: generateRibbons(
				Math.ceil(safeCount * 0.6),
				mobileWidth,
				height,
				opacity,
				mobileBlur,
				resolvedColors,
				mobileDuration,
			);

	const interactiveDesktop = interactive && !isTouchDevice;

	const sharedProps = {
		isInView,
		reducedMotion,
		blendMode,
		intensity,
		highContrast,
		...(scrollFade ? { scrollOpacity } : {}),
		...(interactiveDesktop ? { interactive: true, cursorX, cursorY } : {}),
	};

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			data-testid="aurora-background"
			className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
			style={{ contain: "layout paint style" }}
		>
			<AuroraRibbonSet
				ribbons={ribbons}
				{...(isDesktop ? { mouseX, mouseY } : {})}
				{...sharedProps}
			/>
		</div>
	);
}

/**
 * Aurora light ribbons background - evokes light refracted through crystals.
 *
 * Uses blurred gradient ellipses with mix-blend-mode for additive color mixing.
 * `count` is clamped to 12 max.
 *
 * @example
 * <AuroraBackground palette="jewelry" intensity="subtle" scrollFade />
 *
 * @example
 * <AuroraBackground palette="rose-gold" count={3} blendMode="screen" />
 */
export function AuroraBackground({ disableOnTouch = false, ...props }: AuroraBackgroundProps) {
	const isTouchDevice = useIsTouchDevice();
	const forcedColors = useMediaQuery("(forced-colors: active)");
	const mounted = useMounted();

	if (mounted && ((disableOnTouch && isTouchDevice) || forcedColors)) {
		return null;
	}

	return <AuroraBackgroundInner {...props} />;
}
