"use client";

import {
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { Check } from "lucide-react";
import { m, useReducedMotion } from "motion/react";

import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

const LONG_PRESS_DURATION_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

interface SelectableMobileCardProps {
	/** Identifiant unique de l'item dans la SelectionContext. */
	itemId: string;
	/** Label accessible pour le rôle `button`. */
	ariaLabel: string;
	/**
	 * Action déclenchée quand l'utilisateur tap la carte SANS sélection active
	 * (mode "normal"). Omis : la carte est purement "selectable" (tap = no-op au
	 * repos ; seuls long-press et interactions internes sont supportés).
	 */
	onOpen?: () => void;
	children: ReactNode;
	className?: string;
	/** Désactive toute la logique de sélection (ex: items systèmes). */
	disableSelection?: boolean;
}

/**
 * Universel wrapper mobile items pour bulk-selection 2026.
 *
 * Pattern : **long-press** (450ms, tolérance 10px) pour entrer en mode sélection
 * — inspiré iOS Photos / Gmail Android. Les cartes restent pures au repos (pas
 * de checkbox visible) et adoptent un halo primary + badge checkmark circulaire
 * au coin supérieur droit quand sélectionnées.
 *
 * Interactions :
 * - Tap simple au repos → `onOpen` (drawer ou navigation)
 * - Long-press ≥450ms → entre en mode, toggle item (haptic `medium`)
 * - Tap simple en mode sélection active → toggle (haptic `selection`)
 * - Drag/swipe → annule le long-press
 * - Enter/Space → équivalent tap ; Shift+Enter → entre/toggle en mode sélection
 * - `disableSelection` → désactive la sélection (tap = toujours `onOpen`)
 *
 * A11y :
 * - div role="button" (évite <button> imbriqué, HTML valide + lisibilité VoiceOver)
 * - aria-pressed quand en mode sélection
 * - aria-label enrichi avec l'état
 * - Respecte `prefers-reduced-motion`
 */
export function SelectableMobileCard({
	itemId,
	ariaLabel,
	onOpen,
	children,
	className,
	disableSelection = false,
}: SelectableMobileCardProps) {
	const { isSelected, handleItemSelectionChange, getSelectedCount } = useSelectionContext();
	const haptic = useHaptic();
	const prefersReducedMotion = useReducedMotion();
	const selectionActive = getSelectedCount() > 0;
	const selected = isSelected(itemId);

	const longPressTimerRef = useRef<number | null>(null);
	const didLongPressRef = useRef(false);
	const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

	const clearLongPressTimer = useCallback(() => {
		if (longPressTimerRef.current !== null) {
			window.clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
	}, []);

	useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

	const toggleSelection = useCallback(() => {
		handleItemSelectionChange(itemId, !selected);
	}, [handleItemSelectionChange, itemId, selected]);

	const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (disableSelection) return;
		if (e.pointerType === "mouse" && e.button !== 0) return;
		didLongPressRef.current = false;
		pointerStartRef.current = { x: e.clientX, y: e.clientY };
		clearLongPressTimer();
		longPressTimerRef.current = window.setTimeout(() => {
			didLongPressRef.current = true;
			haptic("medium");
			toggleSelection();
			longPressTimerRef.current = null;
		}, LONG_PRESS_DURATION_MS);
	};

	const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (!pointerStartRef.current) return;
		const dx = Math.abs(e.clientX - pointerStartRef.current.x);
		const dy = Math.abs(e.clientY - pointerStartRef.current.y);
		if (dx > LONG_PRESS_MOVE_TOLERANCE_PX || dy > LONG_PRESS_MOVE_TOLERANCE_PX) {
			clearLongPressTimer();
		}
	};

	const handlePointerEnd = () => {
		clearLongPressTimer();
		pointerStartRef.current = null;
	};

	const handleClick = (e: MouseEvent<HTMLDivElement>) => {
		// Avale le "click" synthétique qui suit le long-press
		if (didLongPressRef.current) {
			didLongPressRef.current = false;
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		if (selectionActive && !disableSelection) {
			haptic("selection");
			toggleSelection();
		} else if (onOpen) {
			haptic("selection");
			onOpen();
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (e.shiftKey && !disableSelection) {
				haptic("medium");
				toggleSelection();
				return;
			}
			if (selectionActive && !disableSelection) {
				haptic("selection");
				toggleSelection();
			} else if (onOpen) {
				haptic("selection");
				onOpen();
			}
		}
	};

	const ariaStateLabel =
		selectionActive && !disableSelection
			? `${ariaLabel}. ${selected ? "Sélectionné" : "Non sélectionné"}. Appuyer pour ${selected ? "désélectionner" : "sélectionner"}`
			: ariaLabel;

	return (
		<div
			role="button"
			tabIndex={0}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerEnd}
			onPointerCancel={handlePointerEnd}
			onPointerLeave={handlePointerEnd}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			onContextMenu={(e) => {
				// Empêche le menu contextuel qui apparaît parfois au long-press sur mobile
				if (!disableSelection) e.preventDefault();
			}}
			aria-label={ariaStateLabel}
			aria-pressed={selectionActive && !disableSelection ? selected : undefined}
			data-selected={selected || undefined}
			data-selection-active={selectionActive || undefined}
			className={cn(
				"relative touch-none rounded-md transition-all outline-none select-none",
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
				selected && "ring-primary ring-offset-background ring-2 ring-offset-2",
				className,
			)}
		>
			{selected ? (
				<m.span
					key="selected-indicator"
					initial={prefersReducedMotion ? false : { scale: 0.4, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={
						prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 25 }
					}
					className="bg-primary text-primary-foreground pointer-events-none absolute top-1 right-1 z-10 flex size-6 items-center justify-center rounded-full shadow-md"
					aria-hidden="true"
				>
					<Check className="size-4" />
				</m.span>
			) : null}
			{children}
		</div>
	);
}
