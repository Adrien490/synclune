"use client";

import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type MouseEvent,
	type TouchEvent,
} from "react";

import { useHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";

const DEFAULT_DELAY = 500;
const DEFAULT_MOVE_TOLERANCE = 10;

/**
 * CSS injecté via `bind.style` pour bloquer les comportements OS qui parasitent
 * le long-press : sélection texte iOS, callout menu, double-tap zoom Android.
 *
 * Note : `WebkitTouchCallout` est non-standard mais nécessaire iOS Safari pour
 * supprimer le menu "Copier / Partager" qui s'ouvre après ~600ms.
 */
const LONG_PRESS_STYLE: CSSProperties = {
	touchAction: "manipulation",
	userSelect: "none",
	WebkitUserSelect: "none",
	WebkitTouchCallout: "none",
};

interface UseLongPressOptions {
	/** Delay in ms before long-press fires. @default 500 */
	delay?: number;
	/** Pixel movement that cancels the gesture (scroll detection). @default 10 */
	moveTolerance?: number;
	/** Haptic pattern fired when threshold is reached. Set to `false` to disable. @default "medium" */
	haptic?: HapticPattern | false;
	/**
	 * Optional click handler — wrapped automatically so the synthetic click that
	 * follows a long-press is suppressed. Pass your "tap to open detail" handler
	 * here instead of writing it inline on the element.
	 */
	onClick?: (e: MouseEvent) => void;
	/**
	 * Opt-in to the `isPressing` flag (visual press feedback). Disabled by
	 * default to avoid 1 re-render per touchstart/end on consumers that don't
	 * use it. @default false
	 */
	trackPressing?: boolean;
}

export interface UseLongPressReturn {
	/**
	 * Spread on the target element. Includes touch handlers, click guard,
	 * contextmenu suppression, and `style` (touch-action + user-select).
	 */
	bind: {
		onTouchStart: (e: TouchEvent) => void;
		onTouchMove: (e: TouchEvent) => void;
		onTouchEnd: () => void;
		onTouchCancel: () => void;
		onContextMenu: (e: MouseEvent) => void;
		onClick: (e: MouseEvent) => void;
		style: CSSProperties;
	};
	/**
	 * True while the user is holding (between touchstart and threshold/release).
	 * Always `false` unless `options.trackPressing === true`.
	 */
	isPressing: boolean;
}

/**
 * Long-press gesture hook (touch only — Pointer Events not supported by
 * design, scope = mobile/admin).
 *
 * - 500ms hold → fires `onLongPress` + haptic "medium" (opt-out via `haptic: false`).
 * - 10px movement tolerance — cancels on scroll/pan.
 * - Wraps `options.onClick` to suppress the synthetic click that immediately
 *   follows a long-press (no escape hatch needed on the consumer side).
 * - Suppresses Android `contextmenu` event triggered after the OS-level long-press.
 * - Injects `touch-action: manipulation; user-select: none; -webkit-touch-callout: none`
 *   via `bind.style` (no need for consumers to remember Tailwind classes).
 * - SSR-safe (no DOM access during render); cleans up on unmount.
 *
 * @example
 * ```tsx
 * const { bind } = useLongPress(() => setMenuOpen(true), {
 *   onClick: () => openDetailDrawer(),
 * });
 * <button {...bind} aria-label="...">…</button>
 * ```
 */
export function useLongPress(
	onLongPress: () => void,
	options: UseLongPressOptions = {},
): UseLongPressReturn {
	const {
		delay = DEFAULT_DELAY,
		moveTolerance = DEFAULT_MOVE_TOLERANCE,
		haptic = "medium",
		onClick,
		trackPressing = false,
	} = options;

	const triggerHapticFn = useHaptic();

	const [isPressing, setIsPressing] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const startPosRef = useRef<{ x: number; y: number } | null>(null);
	const firedRef = useRef(false);

	// Sync callbacks via refs so stable handlers always see the latest closure.
	const onLongPressRef = useRef(onLongPress);
	const onClickRef = useRef(onClick);
	useEffect(() => {
		onLongPressRef.current = onLongPress;
		onClickRef.current = onClick;
	});

	function clear() {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		startPosRef.current = null;
		if (trackPressing) setIsPressing(false);
	}

	useEffect(() => () => clear(), []); // eslint-disable-line react-hooks/exhaustive-deps -- mount/unmount only

	const handleTouchStart = (e: TouchEvent) => {
		const t = e.touches[0];
		if (!t) return;
		firedRef.current = false;
		startPosRef.current = { x: t.clientX, y: t.clientY };
		if (trackPressing) setIsPressing(true);
		timerRef.current = setTimeout(() => {
			firedRef.current = true;
			if (trackPressing) setIsPressing(false);
			if (haptic !== false) triggerHapticFn(haptic);
			onLongPressRef.current();
		}, delay);
	};

	const handleTouchMove = (e: TouchEvent) => {
		if (!startPosRef.current || !timerRef.current) return;
		const t = e.touches[0];
		if (!t) return;
		const dx = Math.abs(t.clientX - startPosRef.current.x);
		const dy = Math.abs(t.clientY - startPosRef.current.y);
		if (dx > moveTolerance || dy > moveTolerance) {
			clear();
		}
	};

	const handleTouchEnd = () => {
		clear();
	};

	const handleContextMenu = (e: MouseEvent) => {
		// Suppress Android browser context menu when our long-press has fired.
		if (firedRef.current) e.preventDefault();
	};

	const handleClick = (e: MouseEvent) => {
		if (firedRef.current) {
			firedRef.current = false;
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		onClickRef.current?.(e);
	};

	return {
		bind: {
			onTouchStart: handleTouchStart,
			onTouchMove: handleTouchMove,
			onTouchEnd: handleTouchEnd,
			onTouchCancel: handleTouchEnd,
			onContextMenu: handleContextMenu,
			onClick: handleClick,
			style: LONG_PRESS_STYLE,
		},
		isPressing,
	};
}
