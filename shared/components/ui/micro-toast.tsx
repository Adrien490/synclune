"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useAnimationControls, useReducedMotion } from "motion/react";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { toastIcons } from "@/shared/components/ui/toast-icons";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useMicroToastStore } from "@/shared/stores/micro-toast-store";
import { cn } from "@/shared/utils/cn";

/**
 * Mini-pastille flottante top-center pour feedback mobile. Deux rendus dérivés
 * du variant (les erreurs partagent le slot — F1) :
 *
 *  1. **Capsule discrète** (tous variants SAUF `error`) — petite bulle `rounded-full`
 *     compacte (`px-3 py-1.5`, `text-xs`, icône réduite). Pour une confirmation
 *     passive (success/cart/wishlist/discount/info/warning) : pas de barre de
 *     progression (contresens sémantique sur un succès), pas de badge `×N` visible.
 *  2. **Pill « présent »** (`error` uniquement) — `rounded-2xl px-4 py-2 text-sm`,
 *     barre de progression + badge `×N` conservés, annonce assertive. L'erreur est
 *     la notif qu'on regarde le plus longtemps : elle garde un poids visuel.
 *
 * Mountée par `<AppToaster />`. Pilotée par `useMicroToastStore` (single-slot,
 * remplace OU coalesce ×N si même message rapide — le coalescing reste actif même
 * en capsule discrète pour éviter le re-spawn/flicker, on n'affiche juste plus le
 * compteur). La couleur du variant est portée par l'icône (`toastIcons`) — warning
 * garde son étoile `text-secondary` et lit donc « attention » même en capsule.
 *
 * Rendu via `createPortal(document.body)` (pattern Radix/Sonner) pour échapper
 * à tout stacking context ancêtre (ex: `SidebarInset` admin avec transform).
 * Sans portal, un ancêtre avec `transform`/`filter`/`isolation: isolate` re-base
 * `position: fixed` et peut masquer la pastille malgré `z-index: 200`.
 *
 * Position : `top: var(--toast-safe-top)` (défaut `max(0.5rem, env(safe-area-inset-top))`,
 * surchargé par layout dans globals.css pour se décaler sous le header fixe admin/shop),
 * left 50%, translateX(-50%).
 * Animation : spring 380/28 (preset `MOTION_CONFIG.spring.toast`) sur entrée
 * (slide-down + scale 0.96→1). Sortie : capsule discrète = settle (`scale 0.92`),
 * pill error = `y:-8`. Reduced-motion : instantané.
 *
 * Gestes :
 *   - Tap = `hide()` immédiat (parité swipe Sonner mobile). Désactivé sur la
 *     variante avec action : la fermeture passe par swipe-up / auto-dismiss pour
 *     ne pas annuler par mégarde une action « Annuler » disponible.
 *   - Swipe-up (motion drag) = `hide()` si offset.y < -40 ou velocity.y < -300.
 *     `dragMomentum={false}` pour ne pas continuer après lâcher. Reste actif sous
 *     reduced-motion (manipulation directe ≠ animation décorative) — c'est l'unique
 *     fermeture non-destructive de la variante undo (rebond élastique annulé alors).
 *
 * Action inline (undo mobile) : si `store.action` est défini, la capsule rend un
 * `m.div` conteneur (HTML valide, pas de bouton imbriqué) avec le message + un
 * bouton « Annuler » inline minimal (pas de croix « × » dédiée — discrétion). La
 * durée allongée (`ACTION_MIN_DURATION_MS`, côté `toast.ts`) laisse le temps de cliquer.
 *
 * A11y :
 *   - Single source of truth : régions sr-only `#toast-live-polite` /
 *     `#toast-live-assertive` du toaster, pilotées par `shared/utils/toast.ts`.
 *     Les erreurs (F1) y sont annoncées en `assertive` AVANT le routage pastille.
 *   - La pastille passive est un `<button>` (tap/swipe-to-dismiss) ; la variante
 *     avec action est un `role="group"`. Dans les deux cas l'`aria-label` reprend
 *     le message visible + le compte `×N` (même non affiché en capsule) pour rester
 *     intelligible si l'AT n'a pas entendu la live region (bug VoiceOver iOS sur
 *     live region nouvellement montée).
 */
export function MicroToast() {
	const visible = useMicroToastStore((state) => state.visible);
	const message = useMicroToastStore((state) => state.message);
	const variant = useMicroToastStore((state) => state.variant);
	const key = useMicroToastStore((state) => state.key);
	const count = useMicroToastStore((state) => state.count);
	const currentDuration = useMicroToastStore((state) => state.currentDuration);
	const action = useMicroToastStore((state) => state.action);
	const hide = useMicroToastStore((state) => state.hide);
	const prefersReducedMotion = useReducedMotion();
	const progressControls = useAnimationControls();
	const mounted = useMounted();

	// Capsule discrète pour tout variant passif ; seule l'erreur garde le pill
	// « présent » (barre de progression + badge ×N + gabarit large).
	const isDiscret = variant !== "error";

	useEffect(() => {
		// La barre de progression n'existe que sur le pill error → inutile d'animer
		// les controls en capsule discrète (le timer auto-dismiss vit dans le store).
		if (!visible || prefersReducedMotion || isDiscret) return;
		progressControls.set({ scaleX: 1 });
		void progressControls.start({
			scaleX: 0,
			transition: { duration: currentDuration / 1000, ease: "linear" },
		});
	}, [visible, key, count, currentDuration, prefersReducedMotion, isDiscret, progressControls]);

	const motionProps = prefersReducedMotion
		? {}
		: {
				initial: { y: -16, opacity: 0, scale: 0.96 },
				animate: { y: 0, opacity: 1, scale: 1 },
				// Capsule : se « repose » (scale) plutôt que de remonter ; pill error : y.
				exit: isDiscret ? { scale: 0.92, opacity: 0 } : { y: -8, opacity: 0 },
				transition: MOTION_CONFIG.spring.toast,
			};

	// Swipe-up = manipulation directe pilotée par le doigt (pas une animation
	// auto-jouée) → reste actif même sous reduced-motion. C'est le SEUL moyen de
	// fermer la variante undo sans déclencher l'action ; le désactiver priverait
	// les utilisateurs reduced-motion de toute fermeture non-destructive. On annule
	// seulement le rebond élastique (rubber-band) sous reduced-motion.
	const dragProps = {
		drag: "y" as const,
		dragConstraints: { top: -200, bottom: 0 },
		dragElastic: prefersReducedMotion ? 0 : { top: 0.4, bottom: 0 },
		dragMomentum: false,
		onDragEnd: (
			_: PointerEvent | MouseEvent | TouchEvent,
			info: { offset: { y: number }; velocity: { y: number } },
		) => {
			if (info.offset.y < -40 || info.velocity.y < -300) hide();
		},
		style: { touchAction: "none" as const },
	};

	// aria-label = contenu en premier (la pastille EST la notification, le tap-to-close
	// est secondaire). Le rôle button + cursor-pointer + describedby suffit à signaler
	// l'action de fermeture. Le canal principal d'annonce reste la live-region globale
	// `#toast-live-polite` ; cet aria-label est le fallback iOS VoiceOver documenté plus haut.
	const accessibleLabel = count > 1 ? `${message} (×${count})` : message;

	// Classes communes (position portal-safe + glass). La forme (rayon/padding/taille
	// texte/gap) diffère entre capsule discrète et pill error.
	const commonClassName = cn(
		"fixed left-1/2 z-(--z-microtoast) -translate-x-1/2",
		"top-[var(--toast-safe-top)]",
		"flex max-w-[90vw] items-center",
		"bg-background/85 border-border/40 shadow-sm backdrop-blur-md",
		"text-foreground font-medium",
		"relative overflow-hidden",
		// Le glassmorphism (translucide + blur) échoue la lisibilité en contraste
		// élevé / forced-colors (le blur est ignoré, l'alpha rend illisible). On
		// retombe sur un fond opaque + bordure franche (WCAG 1.4.11).
		"contrast-more:bg-background contrast-more:border-foreground/40 contrast-more:shadow-md",
		"forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] forced-colors:border-[CanvasText]",
	);
	const shapeClassName = isDiscret
		? "gap-1.5 rounded-full border px-3 py-1.5 text-xs"
		: "gap-2 rounded-2xl border px-4 py-2 text-sm";

	// Icône réduite (~85 %) en capsule discrète pour garder une bulle compacte.
	// inline-flex pour que le `transform: scale` s'applique (transform ne s'applique
	// pas aux éléments inline non remplacés).
	const iconWrapperClassName = cn("inline-flex shrink-0", isDiscret && "scale-[0.85]");

	const countBadge = !isDiscret && count > 1 && (
		<span
			className="text-muted-foreground bg-muted ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
			aria-hidden="true"
		>
			×{count}
		</span>
	);

	const progressBar = !isDiscret && !prefersReducedMotion && (
		<m.span
			key={`progress-${key}-${count}`}
			aria-hidden="true"
			initial={{ scaleX: 1 }}
			animate={progressControls}
			className="bg-foreground/60 absolute right-0 bottom-0 left-0 h-0.5 origin-left rounded-full"
		/>
	);

	if (!mounted) return null;

	return createPortal(
		<>
			<span id="micro-toast-hint" className="sr-only">
				Notification — appuyer pour fermer
			</span>
			<AnimatePresence initial={false}>
				{visible &&
					(action ? (
						// Variante avec action inline (undo mobile). HTML valide : `m.div`
						// conteneur + bouton « Annuler » interne (pas de bouton imbriqué).
						// Capsule discrète, sans croix « × » : fermeture via swipe-up / auto.
						<m.div
							key={key}
							role="group"
							aria-label={accessibleLabel}
							{...motionProps}
							{...dragProps}
							className={cn(commonClassName, shapeClassName)}
						>
							<span className={iconWrapperClassName}>{toastIcons[variant]}</span>
							<span className="line-clamp-1 flex-1 text-left">{message}</span>
							{countBadge}
							<button
								type="button"
								onClick={() => {
									action.onClick();
									hide();
								}}
								className={cn(
									"text-primary -mr-1 ml-0.5 shrink-0 rounded-full px-2 font-semibold",
									"hover:bg-muted/60 can-hover:hover:bg-muted/60 min-h-9",
									"focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
								)}
							>
								{action.label}
							</button>
							{progressBar}
						</m.div>
					) : (
						<m.button
							key={key}
							type="button"
							onClick={hide}
							aria-label={accessibleLabel}
							aria-describedby="micro-toast-hint"
							{...motionProps}
							{...dragProps}
							className={cn(commonClassName, shapeClassName, "cursor-pointer")}
						>
							<span className={iconWrapperClassName}>{toastIcons[variant]}</span>
							<span className={cn("text-left", isDiscret ? "line-clamp-1" : "line-clamp-2")}>
								{message}
							</span>
							{countBadge}
							{progressBar}
						</m.button>
					))}
			</AnimatePresence>
		</>,
		document.body,
	);
}
