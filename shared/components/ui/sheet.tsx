"use client";

import { Drawer as SheetPrimitive } from "@base-ui/react/drawer";
import { XIcon } from "@phosphor-icons/react/ssr";
import * as React from "react";

import { cn } from "@/shared/utils/cn";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { OverlayStackRegister } from "@/shared/components/ui/overlay-stack-register";

type SheetDirection = "top" | "right" | "bottom" | "left";

const SheetContext = React.createContext<{ direction: SheetDirection; handleOnly: boolean }>({
	direction: "right",
	handleOnly: false,
});

/**
 * Vaul exprimait le BORD d'ancrage (`direction`), Base UI exprime le GESTE qui
 * ferme (`swipeDirection`). Une sheet ancrée à droite se ferme vers la droite.
 */
const SWIPE_DIRECTION: Record<SheetDirection, "up" | "down" | "left" | "right"> = {
	top: "up",
	bottom: "down",
	left: "left",
	right: "right",
};

/**
 * Sheet Base UI avec défauts Synclune.
 *
 * Modes de fermeture (cf. `.claude/plans/audit-mes-modales-swipeable-linked-badger.md`) :
 *
 * 1. **Permissif (défaut)** — swipe depuis n'importe où. Convient aux contenus
 *    courts / lectures simples.
 * 2. **Strict (`handleOnly`)** — seule la `SheetHandle` reste préhensible.
 *    ⚠️ Mécanisme INVERSÉ depuis la migration : Vaul avait une liste blanche,
 *    Base UI a une liste noire (`data-base-ui-swipe-ignore`). Cf. `ui/drawer.tsx`.
 * 3. **Saisie clavier (`repositionInputs`)** — `Drawer.VirtualKeyboardProvider`.
 *    Actif par défaut, comme l'était le défaut Vaul.
 *
 * Sans équivalent Base UI, retirés : `scrollLockTimeout`, `closeThreshold` et
 * `noBodyStyles` (Base UI n'ajoute pas la couche `position: fixed` iOS de Vaul).
 */
function Sheet({
	direction = "right",
	open,
	onOpenChange,
	handleOnly = false,
	repositionInputs,
	children,
	...props
}: Omit<SheetPrimitive.Root.Props, "onOpenChange" | "swipeDirection" | "children"> & {
	// `Root.Props.children` accepte aussi une fonction de rendu (API `payload` de
	// Base UI) ; on ne l'expose pas — nos appelants passent des enfants JSX.
	children?: React.ReactNode;
	direction?: SheetDirection;
	handleOnly?: boolean;
	repositionInputs?: boolean;
	onOpenChange?: (open: boolean, eventDetails?: SheetPrimitive.Root.ChangeEventDetails) => void;
}) {
	// Bouton retour du navigateur (mobile) — ET reprise de l'entrée d'historique
	// sur TOUTES les autres fermetures (X, scrim, Escape, swipe). Sans ce
	// `handleClose`, chaque cycle ouvrir/fermer laissait derrière lui une entrée
	// d'historique portant la même URL que la page : la pression suivante sur le
	// retour matériel ne produisait rien de visible (un « back » mort par cycle,
	// cumulatif). `handleClose` ne recule que si notre entrée est encore au
	// sommet de l'historique — cf. use-back-button-close.
	//
	// L'appelant est notifié AVANT que l'entrée soit consommée, pour pouvoir
	// annuler la fermeture (`eventDetails.cancel()`) — cf. `ui/dialog.tsx`.
	const skipNextOnCloseRef = React.useRef(false);

	const { handleClose } = useBackButtonClose({
		isOpen: open ?? false,
		onClose: () => {
			if (skipNextOnCloseRef.current) {
				skipNextOnCloseRef.current = false;
				return;
			}
			onOpenChange?.(false);
		},
		id: "sheet",
	});

	const wrappedOnOpenChange = (
		newOpen: boolean,
		eventDetails: SheetPrimitive.Root.ChangeEventDetails,
	) => {
		if (newOpen) {
			onOpenChange?.(true, eventDetails);
			return;
		}
		onOpenChange?.(false, eventDetails);
		if (eventDetails.isCanceled) return;
		skipNextOnCloseRef.current = true;
		handleClose();
	};

	const body =
		repositionInputs === false ? (
			children
		) : (
			<SheetPrimitive.VirtualKeyboardProvider>{children}</SheetPrimitive.VirtualKeyboardProvider>
		);

	// L'empilement des overlays imbriqués est natif chez Base UI : le
	// `VaulNestedProvider` maison a disparu, et Escape ne traverse plus qu'une
	// seule pile de couches — c'est ce qui referme l'invariant du verrou unique.
	return (
		<SheetContext.Provider value={{ direction, handleOnly }}>
			<SheetPrimitive.Root
				data-slot="sheet"
				open={open}
				onOpenChange={wrappedOnOpenChange}
				swipeDirection={SWIPE_DIRECTION[direction]}
				{...props}
			>
				{body}
			</SheetPrimitive.Root>
		</SheetContext.Provider>
	);
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

/**
 * Poignée des bottom-sheets mobile. Base UI n'a pas de primitive `Handle` — tout
 * le popup est préhensible ; la poignée n'est qu'un repère visuel, sauf en mode
 * `handleOnly` où elle redevient la seule zone non exclue du geste. Pill visible
 * avec zone tactile étendue.
 */
function SheetHandle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-handle"
			className={cn(
				// Visuel agrandi pour repère pouce : 8×56 (vs 6×40 avant)
				// Contraste renforcé (/45 vs /30) — affordance évidente
				"bg-muted-foreground/45 relative mx-auto mt-3 mb-1 h-2 w-14 shrink-0 rounded-full",
				"cursor-grab active:cursor-grabbing",
				// Zone tactile étendue ~56×144px (vs ~36×88 avant) — confortable pour pouce
				"before:absolute before:-inset-x-10 before:-inset-y-6 before:content-['']",
				className,
			)}
			{...props}
		/>
	);
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

/** `Backdrop` chez Base UI — le nom public reste `SheetOverlay`. */
function SheetOverlay({ className, onClick, ...props }: SheetPrimitive.Backdrop.Props) {
	return (
		<SheetPrimitive.Backdrop
			data-slot="sheet-overlay"
			className={cn(
				"fixed inset-0 z-(--z-overlay) bg-black/50 backdrop-blur-sm backdrop-saturate-150",
				"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out",
				"motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0",
				// Durée alignée sur `PANEL_TRANSITION` (300 ms) + `fill-mode-forwards` :
				// cf. le commentaire de `ui/dialog.tsx`. Le démontage n'est piloté que
				// par les animations du POPUP (`useOpenStateTransitions` de Base UI
				// n'observe que `popupRef`), donc un scrim qui finit avant lui reste
				// affiché — et sans fill mode, réapparaît opaque. C'est le cas le pire
				// du repo : 150 ms de scrim noir ressuscité à chaque fermeture.
				"fill-mode-forwards motion-safe:duration-300",
				className,
			)}
			onClick={onClick}
			{...props}
		/>
	);
}

/** Alignement du panneau dans le `Viewport` (couche fixe plein écran). */
const VIEWPORT_ALIGNMENT: Record<SheetDirection, string> = {
	bottom: "items-end justify-center",
	top: "items-start justify-center",
	left: "items-stretch justify-start",
	right: "items-stretch justify-end",
};

/**
 * Entrée, sortie ET suivi du geste partagent la MÊME propriété `transform`, donc
 * une transition — pas une animation keyframes comme les autres overlays. Une
 * animation `slide-in` écraserait le `translate` piloté par le doigt (les
 * keyframes l'emportent sur la déclaration, puis `fill-mode: both` fige la
 * valeur finale), et le panneau se décrocherait du geste.
 *
 * Corollaire : le killswitch `prefers-reduced-motion` d'`animations.css` ne
 * coupe que `animation` — c'est `app/styles/pwa.css` qui neutralise CES
 * transitions-là.
 */
const SWIPE_TRANSFORM: Record<SheetDirection, string> = {
	bottom:
		"[transform:translateY(var(--drawer-swipe-movement-y))] data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]",
	top: "[transform:translateY(var(--drawer-swipe-movement-y))] data-starting-style:[transform:translateY(-100%)] data-ending-style:[transform:translateY(-100%)]",
	left: "[transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(-100%)] data-ending-style:[transform:translateX(-100%)]",
	right:
		"[transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)]",
};

/** Courbe Vaul historique, conservée pour ne pas changer le ressenti. */
const PANEL_TRANSITION = "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]";

function SheetContent({
	className,
	children,
	overlayClassName,
	showCloseButton = true,
	title,
	onOverlayClick,
	registerOverlay = true,
	...props
}: Omit<SheetPrimitive.Popup.Props, "className"> & {
	className?: string;
	overlayClassName?: string;
	showCloseButton?: boolean;
	/** Accessible title for screen readers. Renders a sr-only Sheet.Title. */
	title?: string;
	/** Fired when the user taps the scrim overlay to dismiss.
	 * Useful for attaching haptic feedback. */
	onOverlayClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
	/**
	 * When `false`, this sheet does NOT push onto the global overlay stack,
	 * so bottom-anchored UI (AdminMobileBottomBar) stays visible behind it.
	 * Use for onboarding/welcome sheets that should not collapse the bar.
	 * @default true
	 */
	registerOverlay?: boolean;
}) {
	const { direction, handleOnly } = React.use(SheetContext);

	return (
		<SheetPortal>
			<OverlayStackRegister enabled={registerOverlay} />
			<SheetOverlay className={overlayClassName} onClick={onOverlayClick} />
			<SheetPrimitive.Viewport
				data-slot="sheet-viewport"
				className={cn("fixed inset-0 z-(--z-overlay) flex", VIEWPORT_ALIGNMENT[direction])}
			>
				<SheetPrimitive.Popup
					data-slot="sheet-content"
					data-direction={direction}
					className={cn(
						// Base + group pour permettre group-has-[[data-pending]]/sheet sur les descendants
						"group/sheet bg-background flex flex-col gap-4 shadow-lg",
						PANEL_TRANSITION,
						SWIPE_TRANSFORM[direction],
						// Right sheet avec safe-area latérale (mode paysage)
						direction === "right" &&
							"h-full w-full border-l pr-[max(0px,env(safe-area-inset-right))] sm:max-w-sm",
						// Left sheet avec safe-area latérale (mode paysage)
						direction === "left" &&
							"h-full w-full border-r pl-[max(0px,env(safe-area-inset-left))] sm:max-w-sm",
						direction === "top" && "h-auto w-full border-b pt-[max(0px,env(safe-area-inset-top))]",
						direction === "bottom" &&
							"h-auto w-full border-t pb-[max(0px,env(safe-area-inset-bottom))]",
						className,
					)}
					{...props}
				>
					{title && <SheetPrimitive.Title className="sr-only">{title}</SheetPrimitive.Title>}
					<SheetSwipeGuard enabled={handleOnly}>
						{children}
						{showCloseButton && (
							<SheetPrimitive.Close
								aria-label="Fermer le panneau"
								className="focus-ring absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 inline-flex size-11 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none"
							>
								<XIcon className="size-5" aria-hidden="true" />
								<span className="sr-only">Fermer</span>
							</SheetPrimitive.Close>
						)}
					</SheetSwipeGuard>
				</SheetPrimitive.Popup>
			</SheetPrimitive.Viewport>
		</SheetPortal>
	);
}

/**
 * Exclut son sous-arbre du geste de fermeture (mode `handleOnly`).
 * `display: contents` : invisible pour le flex du popup, mais présent dans
 * l'arbre DOM où le `closest()` de Base UI le trouve. Cf. `ui/drawer.tsx`.
 */
function SheetSwipeGuard({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
	if (!enabled) return children;
	return (
		<div className="contents" data-base-ui-swipe-ignore="">
			{children}
		</div>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("flex flex-col gap-1.5 p-4", className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col gap-2 p-4", className)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("text-foreground font-display text-lg font-normal", className)}
			{...props}
		/>
	);
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHandle,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
};
