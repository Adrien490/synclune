"use client";

import { Undo2 } from "lucide-react";
import { m, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { UI_COPY } from "@/shared/constants/ui-copy";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { announceToScreenReader } from "@/shared/utils/toast";
import { cn } from "@/shared/utils/cn";

/**
 * Pastille inline "tombstone" pour pattern undo type Gmail / iOS Mail.
 *
 * Affichée à la place d'un item de liste qui vient d'être supprimé.
 * Le user a `duration` ms pour cliquer "Annuler" avant que `onExpire`
 * soit appelé (suppression effective côté UI).
 *
 * Usage actuel : mobile only via `markAsTombstone` du `CartOptimisticContext`
 * (`modules/cart/components/cart-sheet.tsx`). Sur desktop, le pattern toast
 * Sonner avec action reste utilisé pour préserver l'a11y bouton classique.
 *
 * A11y :
 *   - Annonce SR via la live region globale `#toast-live-polite` (toaster.tsx)
 *     pour éviter les races VoiceOver iOS sur live region nouvellement montée
 *   - Bouton "Annuler" focusable au clavier, avec `aria-label` parlant
 *   - `autoFocus` optionnel : focus le bouton dès l'apparition (utile si le
 *     focus précédent était sur le bouton de suppression unmounted)
 *   - `title` complet sur le message tronqué (hover desktop) + texte intégral
 *     exposé par défaut au SR (pas de truncation côté accessible name)
 *   - `undoAriaLabel` recommandé : les 3 callers actuels passent un libellé
 *     contextualisé ("Annuler la suppression de Bague Lune"). Si omis, fallback
 *     sur `undoLabel` simple ("Annuler") plutôt que de répéter `message` qui
 *     contient déjà le contexte item.
 *
 * Pause/resume :
 *   - Le compte à rebours s'arrête au hover/focus de la pastille et reprend
 *     au mouseleave/blur — comme Gmail/iOS Mail
 *   - Pause aussi sur `document.visibilitychange` (switch d'onglet) pour
 *     éviter expiration silencieuse en background
 *
 * Reduced motion :
 *   - Fade entrée + barre de progression désactivés
 *   - Fallback : compteur sr-only "Expire dans Ns" mis à jour chaque seconde
 *
 * Cleanup :
 *   - Timer + animation cancelés au unmount → si le composant est démonté
 *     avant l'expiration (navigation), `onExpire` n'est PAS appelé. L'appelant
 *     doit gérer le flush si nécessaire.
 */

const DEFAULT_DURATION_MS = 5000;

export interface TombstoneProps {
	message: string;
	onUndo: () => void;
	onExpire: () => void;
	duration?: number;
	className?: string;
	undoLabel?: string;
	/** Aria-label parlant pour le bouton undo, ex: "Annuler la suppression de Bague Lune". */
	undoAriaLabel?: string;
	/** Focus le bouton Annuler à l'apparition (default false). */
	autoFocus?: boolean;
}

export function Tombstone({
	message,
	onUndo,
	onExpire,
	duration = DEFAULT_DURATION_MS,
	className,
	undoLabel = UI_COPY.actions.undo,
	undoAriaLabel,
	autoFocus = false,
}: TombstoneProps) {
	const prefersReducedMotion = useReducedMotion();
	const controls = useAnimationControls();
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const wrapperRef = useRef<HTMLDivElement | null>(null);

	const onExpireRef = useRef(onExpire);
	const onUndoRef = useRef(onUndo);
	useEffect(() => {
		onExpireRef.current = onExpire;
		onUndoRef.current = onUndo;
	}, [onExpire, onUndo]);

	const remainingRef = useRef(duration);
	const startedAtRef = useRef(0);
	const isPausedRef = useRef(false);
	const undoneRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [remainingSeconds, setRemainingSeconds] = useState(() => Math.ceil(duration / 1000));
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		announceToScreenReader(message, "polite");

		const clearTimer = () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};

		const clearInterval_ = () => {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};

		const startCountdown = () => {
			startedAtRef.current = Date.now();
			isPausedRef.current = false;
			if (!prefersReducedMotion) {
				void controls.start({
					scaleX: 0,
					transition: { duration: remainingRef.current / 1000, ease: "linear" },
				});
			}
			timerRef.current = setTimeout(() => {
				if (undoneRef.current) return;
				onExpireRef.current();
			}, remainingRef.current);

			if (prefersReducedMotion) {
				setRemainingSeconds(Math.ceil(remainingRef.current / 1000));
				intervalRef.current = setInterval(() => {
					if (isPausedRef.current || undoneRef.current) return;
					const elapsed = Date.now() - startedAtRef.current;
					const left = Math.max(0, remainingRef.current - elapsed);
					setRemainingSeconds(Math.ceil(left / 1000));
				}, 1000);
			}
		};

		const pause = () => {
			if (isPausedRef.current || undoneRef.current) return;
			isPausedRef.current = true;
			const elapsed = Date.now() - startedAtRef.current;
			remainingRef.current = Math.max(0, remainingRef.current - elapsed);
			clearTimer();
			clearInterval_();
			if (!prefersReducedMotion) {
				controls.stop();
			}
		};

		const resume = () => {
			if (!isPausedRef.current || undoneRef.current) return;
			if (remainingRef.current <= 0) {
				onExpireRef.current();
				return;
			}
			startCountdown();
		};

		const handleVisibility = () => {
			if (document.hidden) pause();
			else resume();
		};

		startCountdown();
		document.addEventListener("visibilitychange", handleVisibility);

		const wrapper = wrapperRef.current;
		if (wrapper) {
			wrapper.addEventListener("mouseenter", pause);
			wrapper.addEventListener("mouseleave", resume);
			wrapper.addEventListener("focusin", pause);
			wrapper.addEventListener("focusout", resume);
		}

		return () => {
			clearTimer();
			clearInterval_();
			if (!prefersReducedMotion) controls.stop();
			document.removeEventListener("visibilitychange", handleVisibility);
			if (wrapper) {
				wrapper.removeEventListener("mouseenter", pause);
				wrapper.removeEventListener("mouseleave", resume);
				wrapper.removeEventListener("focusin", pause);
				wrapper.removeEventListener("focusout", resume);
			}
		};
	}, [controls, duration, message, prefersReducedMotion]);

	useEffect(() => {
		if (autoFocus) {
			buttonRef.current?.focus({ preventScroll: true });
		}
	}, [autoFocus]);

	const handleUndo = () => {
		if (undoneRef.current) return;
		undoneRef.current = true;
		if (timerRef.current !== null) clearTimeout(timerRef.current);
		if (intervalRef.current !== null) clearInterval(intervalRef.current);
		if (!prefersReducedMotion) controls.stop();
		triggerHaptic("light");
		onUndoRef.current();
	};

	const motionProps = prefersReducedMotion
		? {}
		: {
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				exit: { opacity: 0 },
				transition: { duration: 0.15 },
			};

	const ariaLabelFallback = undoAriaLabel ?? undoLabel;

	return (
		<m.div
			{...motionProps}
			ref={wrapperRef}
			data-slot="tombstone"
			className={cn(
				"bg-muted/40 border-border/60 relative overflow-hidden rounded-lg border border-dashed",
				"flex items-center justify-between gap-2 px-3 py-2",
				"text-muted-foreground text-sm",
				className,
			)}
		>
			<span className="truncate" title={message}>
				{message}
			</span>
			{prefersReducedMotion && (
				<span className="sr-only" aria-live="polite">
					{UI_COPY.actions.expiresIn(remainingSeconds)}
				</span>
			)}
			<Button
				ref={buttonRef}
				type="button"
				variant="ghost"
				size="sm"
				onClick={handleUndo}
				aria-label={ariaLabelFallback}
				className="text-foreground hover:text-primary -mr-2 shrink-0"
			>
				<Undo2 className="size-3.5" aria-hidden="true" />
				{undoLabel}
			</Button>
			{!prefersReducedMotion && (
				<m.span
					aria-hidden="true"
					initial={{ scaleX: 1 }}
					animate={controls}
					className="bg-foreground/60 absolute right-0 bottom-0 left-0 h-0.5 origin-left"
				/>
			)}
		</m.div>
	);
}

export { DEFAULT_DURATION_MS as TOMBSTONE_DURATION_MS };
