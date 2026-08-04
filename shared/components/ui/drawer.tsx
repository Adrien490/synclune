"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import * as React from "react";

import { cn } from "@/shared/utils/cn";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { OverlayStackRegister } from "@/shared/components/ui/overlay-stack-register";

type DrawerDirection = "top" | "right" | "bottom" | "left";

const DrawerContext = React.createContext<{ direction: DrawerDirection; handleOnly: boolean }>({
	direction: "bottom",
	handleOnly: false,
});

/**
 * Vaul exprimait le BORD d'ancrage (`direction`), Base UI exprime le GESTE qui
 * ferme (`swipeDirection`). Un drawer ancré en bas se ferme vers le bas.
 */
const SWIPE_DIRECTION: Record<DrawerDirection, "up" | "down" | "left" | "right"> = {
	top: "up",
	bottom: "down",
	left: "left",
	right: "right",
};

/**
 * Drawer Base UI avec défauts Synclune.
 *
 * Modes de fermeture :
 *
 * 1. **Permissif (défaut)** — swipe depuis n'importe où dans le panneau.
 * 2. **Strict (`handleOnly`)** — seule la `DrawerHandle` reste préhensible.
 *    ⚠️ Le mécanisme s'est INVERSÉ à la migration : Vaul avait une liste
 *    blanche (« seule la poignée drague »), Base UI a une liste noire
 *    (`data-base-ui-swipe-ignore` sur les descendants à exclure). On enveloppe
 *    donc le contenu dans un conteneur `display:contents` porteur de
 *    l'attribut — invisible pour la mise en page flex, mais trouvé par le
 *    `closest()` de Base UI.
 * 3. **Saisie clavier (`repositionInputs`)** — `Drawer.VirtualKeyboardProvider`
 *    remonte le champ focusé au-dessus du clavier mobile. Actif par défaut,
 *    comme l'était le défaut Vaul.
 *
 * Sans équivalent Base UI, retirés : `scrollLockTimeout` et `closeThreshold`
 * (Base UI arbitre scroll vs swipe par la direction du geste et la vélocité,
 * pas par un délai ni un seuil configurables).
 */
function Drawer({
	open,
	onOpenChange,
	direction = "bottom",
	handleOnly = false,
	repositionInputs,
	children,
	...props
}: Omit<DrawerPrimitive.Root.Props, "onOpenChange" | "swipeDirection" | "children"> & {
	// `Root.Props.children` accepte aussi une fonction de rendu (API `payload` de
	// Base UI) ; on ne l'expose pas — nos appelants passent des enfants JSX.
	children?: React.ReactNode;
	direction?: DrawerDirection;
	handleOnly?: boolean;
	repositionInputs?: boolean;
	onOpenChange?: (open: boolean, eventDetails?: DrawerPrimitive.Root.ChangeEventDetails) => void;
}) {
	// Cf. `ui/dialog.tsx` : on notifie AVANT de consommer l'entrée d'historique,
	// pour laisser l'appelant annuler la fermeture (`eventDetails.cancel()`).
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
		id: "drawer",
	});

	const wrappedOnOpenChange = (
		newOpen: boolean,
		eventDetails: DrawerPrimitive.Root.ChangeEventDetails,
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
			<DrawerPrimitive.VirtualKeyboardProvider>{children}</DrawerPrimitive.VirtualKeyboardProvider>
		);

	// L'empilement des drawers imbriqués est natif chez Base UI (`data-nested`,
	// `--nested-drawers`) : le `VaulNestedProvider` maison a disparu.
	return (
		<DrawerContext.Provider value={{ direction, handleOnly }}>
			<DrawerPrimitive.Root
				data-slot="drawer"
				open={open}
				onOpenChange={wrappedOnOpenChange}
				swipeDirection={SWIPE_DIRECTION[direction]}
				{...props}
			>
				{body}
			</DrawerPrimitive.Root>
		</DrawerContext.Provider>
	);
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
	return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
	return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
	return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

/**
 * Poignée de drag. Base UI n'a pas de primitive `Handle` — la totalité du popup
 * est préhensible, la poignée n'est donc qu'un repère visuel… sauf en mode
 * `handleOnly`, où elle redevient la seule zone non exclue du geste.
 */
function DrawerHandle({
	className,
	"aria-label": ariaLabel = "Glisser pour fermer",
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-handle"
			aria-label={ariaLabel}
			className={cn(
				"bg-muted-foreground/30 mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full",
				"focus-ring",
				className,
			)}
			{...props}
		/>
	);
}

/** `Backdrop` chez Base UI — le nom public reste `DrawerOverlay`. */
function DrawerOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
	return (
		<DrawerPrimitive.Backdrop
			data-slot="drawer-overlay"
			className={cn(
				"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0 fixed inset-0 z-(--z-overlay) bg-black/50 backdrop-blur-sm backdrop-saturate-150",
				className,
			)}
			{...props}
		/>
	);
}

/** Alignement du panneau dans le `Viewport` (couche fixe plein écran). */
const VIEWPORT_ALIGNMENT: Record<DrawerDirection, string> = {
	bottom: "items-end justify-center",
	top: "items-start justify-center",
	left: "items-stretch justify-start",
	right: "items-stretch justify-end",
};

/**
 * Entrée, sortie et suivi du geste partagent la même propriété `transform` :
 * c'est une TRANSITION, pas une animation keyframes (qui écraserait le
 * `translate` piloté par le doigt). Cf. le commentaire détaillé de `ui/sheet.tsx`.
 */
const SWIPE_TRANSFORM: Record<DrawerDirection, string> = {
	bottom:
		"[transform:translateY(var(--drawer-swipe-movement-y))] data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]",
	top: "[transform:translateY(var(--drawer-swipe-movement-y))] data-starting-style:[transform:translateY(-100%)] data-ending-style:[transform:translateY(-100%)]",
	left: "[transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(-100%)] data-ending-style:[transform:translateX(-100%)]",
	right:
		"[transform:translateX(var(--drawer-swipe-movement-x))] data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)]",
};

/** Courbe Vaul historique, conservée pour ne pas changer le ressenti. */
const PANEL_TRANSITION = "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]";

function DrawerContent({
	className,
	children,
	onOverlayClick,
	registerOverlay = true,
	...props
}: Omit<DrawerPrimitive.Popup.Props, "className"> & {
	className?: string;
	/**
	 * Callback fired when the scrim (overlay) is tapped/clicked.
	 * Utile pour déclencher un haptic `selection` sur dismiss mobile
	 * — cohérent avec le pattern Sheet primitive.
	 */
	onOverlayClick?: React.MouseEventHandler<HTMLDivElement>;
	/** Parité avec Dialog/AlertDialog/Sheet — opt-out de l'overlay-stack. */
	registerOverlay?: boolean;
}) {
	const { direction, handleOnly } = React.use(DrawerContext);

	return (
		<DrawerPortal data-slot="drawer-portal">
			<OverlayStackRegister enabled={registerOverlay} />
			<DrawerOverlay onClick={onOverlayClick} />
			<DrawerPrimitive.Viewport
				data-slot="drawer-viewport"
				className={cn("fixed inset-0 z-(--z-overlay) flex", VIEWPORT_ALIGNMENT[direction])}
			>
				<DrawerPrimitive.Popup
					data-slot="drawer-content"
					data-direction={direction}
					className={cn(
						"group/drawer-content bg-background flex h-auto flex-col px-4 shadow-xl",
						PANEL_TRANSITION,
						SWIPE_TRANSFORM[direction],
						direction === "top" && "mb-24 max-h-[80vh] w-full rounded-b-xl border-b",
						direction === "bottom" &&
							"mt-24 max-h-[90vh] w-full overflow-hidden rounded-t-xl border-t pb-[max(1rem,env(safe-area-inset-bottom))]",
						direction === "right" &&
							"w-full border-l pr-[max(0px,env(safe-area-inset-right))] sm:max-w-sm",
						direction === "left" &&
							"w-full border-r pl-[max(0px,env(safe-area-inset-left))] sm:max-w-sm",
						className,
					)}
					{...props}
				>
					{/* Handle visible uniquement pour les bottom drawers */}
					{direction === "bottom" && <DrawerHandle />}
					<DrawerSwipeGuard enabled={handleOnly}>{children}</DrawerSwipeGuard>
				</DrawerPrimitive.Popup>
			</DrawerPrimitive.Viewport>
		</DrawerPortal>
	);
}

/**
 * Exclut son sous-arbre du geste de fermeture (mode `handleOnly`).
 *
 * `display: contents` : le conteneur disparaît de la mise en page — les enfants
 * restent des items flex directs du popup, donc `flex-1` sur le body et
 * `mt-auto` sur le footer continuent de fonctionner — mais il reste dans l'ARBRE
 * DOM, où le `closest('[data-base-ui-swipe-ignore]')` de Base UI le trouve.
 */
function DrawerSwipeGuard({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
	if (!enabled) return children;
	return (
		<div className="contents" data-base-ui-swipe-ignore="">
			{children}
		</div>
	);
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-header"
			className={cn("flex flex-col gap-0.5 py-4 text-left md:gap-1.5", className)}
			{...props}
		/>
	);
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-footer"
			className={cn("mt-auto flex flex-col gap-2 py-4", className)}
			{...props}
		/>
	);
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-body"
			className={cn("flex-1 overflow-y-auto pb-4", className)}
			{...props}
		/>
	);
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
	return (
		<DrawerPrimitive.Title
			data-slot="drawer-title"
			className={cn("text-foreground font-display text-lg font-normal", className)}
			{...props}
		/>
	);
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
	return (
		<DrawerPrimitive.Description
			data-slot="drawer-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Drawer,
	DrawerTrigger,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerBody,
	DrawerFooter,
	DrawerTitle,
	DrawerDescription,
};
