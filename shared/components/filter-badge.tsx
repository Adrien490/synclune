"use client";

import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";
import { XIcon } from "@phosphor-icons/react/ssr";
import { m, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useRef } from "react";

const ANIMATION_PROPS = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
} as const;

const DRAG_CONSTRAINTS = { left: 0, right: 0 } as const;
const DRAG_DISMISS_THRESHOLD = 80;
// Un flick (geste court mais vif) supprime aussi — la convention iOS combine
// distance ET vélocité. Le plancher de distance évite qu'un micro-tremblement
// rapide compte comme une intention.
const DRAG_FLICK_MIN_OFFSET = 24;
const DRAG_FLICK_MIN_VELOCITY = 500;

interface FilterBadgeProps {
	filter: FilterDefinition;
	formatFilter?: (filter: FilterDefinition) => {
		label: string;
		displayValue?: string;
	} | null;
	onRemove: (key: string, value?: string) => void;
	/**
	 * Habillage. `pill` (défaut) : la pilule neutre historique — c'est elle que
	 * rend l'admin. `etiquette` : « L'étiquette de bocal » (artifact
	 * filter-badges 2026-08-05, lot 1) — rayon de la ShelfBar, liseré gauche à
	 * l'accent de la facette (fourni via `accentClassName`).
	 */
	appearance?: "pill" | "etiquette";
	/**
	 * Classes d'accent de facette (liseré + lavis), `etiquette` uniquement.
	 * SSOT : `FILTER_BADGE_ACCENTS` (`catalog-accents.constants.ts`). La couleur
	 * DOUBLE le label visible, elle ne le remplace jamais (WCAG 1.4.1).
	 */
	accentClassName?: string;
}

export function FilterBadge({
	filter,
	formatFilter,
	onRemove,
	appearance = "pill",
	accentClassName,
}: FilterBadgeProps) {
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();

	// Motion ne supprime que SON geste press (`onTap` teste `isDragActive()`),
	// jamais le `click` natif : sur un hybride (iPad + trackpad — `TOUCH_QUERY`
	// matche, le drag est armé, et un drag souris émet un vrai `click` au
	// relâchement), `onDragEnd` puis `onClick` appelleraient handleRemove DEUX
	// fois. Le pur tactile n'est pas concerné (pas de click synthétique après
	// un swipe). Ré-audit FilterBadge 2026-08-05.
	const wasDragged = useRef(false);

	// Left-only swipe-to-dismiss (iOS convention) — right rubberband stays full-opacity by design.
	const x = useMotionValue(0);
	const dragOpacity = useTransform(
		x,
		[-DRAG_DISMISS_THRESHOLD, 0, DRAG_DISMISS_THRESHOLD],
		[0.2, 1, 1],
	);
	const dragScale = useTransform(
		x,
		[-DRAG_DISMISS_THRESHOLD, 0, DRAG_DISMISS_THRESHOLD],
		[0.92, 1, 1],
	);

	const formatted = formatFilter?.(filter);

	// If the function returns null, don't render the badge
	if (formatted === null) {
		return null;
	}

	const displayLabel = formatted?.label ?? filter.label;
	const displayValue = formatted?.displayValue ?? filter.displayValue;
	// Le nom accessible CONTIENT le texte visible (« Label : Valeur ») —
	// WCAG 2.5.3 Label in Name, une commande vocale peut viser ce qu'elle voit.
	const filterDescription = displayValue ? `${displayLabel} : ${displayValue}` : displayLabel;
	const ariaLabelRemove = `Supprimer le filtre ${filterDescription}`;

	// Parent `FilterBadges` has aria-live=polite — removal is announced via list update.
	const handleRemove = () => {
		triggerHaptic("selection");
		let value: string | undefined;

		if (typeof filter.value === "string") {
			value = filter.value;
		} else if (typeof filter.value === "number" || typeof filter.value === "boolean") {
			value = String(filter.value);
		} else if (filter.value instanceof Date) {
			value = filter.value.toISOString();
		} else if (Array.isArray(filter.value)) {
			// `useFilter` decomposes arrays into distinct entries — reaching this signals a hook contract regression.
			if (process.env.NODE_ENV !== "production") {
				throw new Error(
					`FilterBadge received an array value for key "${filter.key}". The useFilter hook should decompose arrays before rendering.`,
				);
			}
		}

		onRemove(filter.key, value);
	};

	const animationProps = shouldReduceMotion ? {} : ANIMATION_PROPS;

	const transitionProps = maybeReduceMotion(
		{
			duration: MOTION_CONFIG.duration.fast,
			ease: MOTION_CONFIG.easing.easeInOut,
		},
		shouldReduceMotion ?? false,
	);
	const enableDrag = isTouchDevice && !shouldReduceMotion;

	return (
		<m.button
			type="button"
			{...animationProps}
			transition={transitionProps}
			onPointerDown={() => {
				wasDragged.current = false;
			}}
			onClick={(event) => {
				// `event.detail === 0` = activation clavier (Entrée/Espace), jamais
				// précédée d'un drag — seule la paire drag → click pointeur est avalée.
				if (wasDragged.current && event.detail !== 0) {
					wasDragged.current = false;
					return;
				}
				handleRemove();
			}}
			aria-label={ariaLabelRemove}
			drag={enableDrag ? "x" : false}
			dragConstraints={DRAG_CONSTRAINTS}
			dragElastic={0.3}
			onDragStart={() => {
				wasDragged.current = true;
			}}
			onDragEnd={(_, info) => {
				const isDismiss = info.offset.x < -DRAG_DISMISS_THRESHOLD;
				const isFlick =
					info.offset.x < -DRAG_FLICK_MIN_OFFSET && info.velocity.x < -DRAG_FLICK_MIN_VELOCITY;
				if (isDismiss || isFlick) {
					handleRemove();
				}
			}}
			style={{
				x,
				opacity: enableDrag ? dragOpacity : undefined,
				scale: enableDrag ? dragScale : undefined,
			}}
			className={cn(
				// Layout — 44 px à TOUS les paliers : `sm:` couvre l'iPad, qui est
				// tactile (le swipe de ce même bouton s'y active). Lot 0 2026-08-05.
				"group flex items-center gap-1.5",
				"min-h-11",
				"px-3",
				// Typography
				"text-sm",
				// Max width
				"max-w-70 sm:max-w-80",
				// States
				"can-hover:cursor-pointer touch-manipulation",
				"active:scale-[0.95] sm:active:scale-[0.98]",
				"active:bg-destructive/15 active:border-destructive/30",
				// Focus ring (SSOT — app/globals.css @utility focus-ring)
				"focus-ring",
				appearance === "etiquette"
					? cn(
							// « L'étiquette de bocal » : rayon de la ShelfBar, liseré de
							// facette, lavis 10 % (surfaces, jamais l'encre). Le lift au
							// survol est décoratif — l'affordance porteuse (le ×) a déjà
							// sa parité focus plus bas.
							"bg-card rounded-sm border border-l-3 shadow-2xs",
							"motion-safe:transition-[color,background-color,border-color,box-shadow,translate] motion-safe:duration-150",
							"can-hover:hover:shadow-md can-hover:hover:-translate-y-px",
							accentClassName,
						)
					: cn(
							// Pilule historique (admin)
							"rounded-full border",
							"motion-safe:transition-colors motion-safe:duration-150",
							"can-hover:hover:bg-accent can-hover:hover:border-primary/40",
						),
			)}
		>
			{/* Text: label + value. Le label reste visible à TOUS les paliers :
			 * c'est lui qui désambiguïse « Argent » (couleur) de « Argent 925 »
			 * (matériau) — la couleur de facette de l'étiquette ne fait que le
			 * doubler. L'ancien `compactMobile` le masquait sous `sm`. */}
			<span className="truncate">
				{displayValue && displayValue.length > 0 ? (
					<>
						<span className="text-muted-foreground font-normal">{displayLabel} :</span>{" "}
						<span className="font-medium">{displayValue}</span>
					</>
				) : (
					<span className="font-medium">{displayLabel}</span>
				)}
			</span>

			{/* X opacity: full on mobile (primary affordance, no hover), dimmed-at-rest on desktop.
			 * `group-focus-visible:` en parité du hover : le badge entier est un
			 * `<button>`, et un utilisateur au clavier n'avait aucun renforcement
			 * visuel de l'affordance de suppression là où la souris en recevait un
			 * (audit responsive 2026-07-26, P2). Pas de gate `can-hover` ici — le
			 * focus clavier existe aussi sur les appareils tactiles. */}
			<span
				aria-hidden="true"
				className={cn(
					"shrink-0",
					"opacity-100 sm:opacity-60",
					"can-hover:group-hover:opacity-100",
					"group-focus-visible:opacity-100",
					"motion-safe:transition-opacity motion-safe:duration-150",
					// Pastille à TOUS les paliers (l'icône ne rapetisse plus là où la
					// pastille apparaissait — incohérence relevée à l'audit 2026-08-05).
					"flex items-center justify-center",
					"size-5 rounded-full",
					"bg-destructive/10 text-destructive",
				)}
			>
				<XIcon className="size-3" />
			</span>
		</m.button>
	);
}
