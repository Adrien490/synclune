"use client";

import { useIsInsideVaul, VaulNestedProvider } from "@/shared/components/ui/vaul-nested-context";
import { cn } from "@/shared/utils/cn";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useRegisterOverlay } from "@/shared/hooks/use-register-overlay";
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

/**
 * Vaul Drawer wrapper avec défauts Synclune.
 *
 * Modes de fermeture (cf. `.claude/plans/audit-mes-modales-swipeable-linked-badger.md`) :
 *
 * 1. **Permissif (défaut)** — Swipe-from-anywhere ferme le drawer. Convient aux
 *    listes courtes / menus simples (SortDrawer, ResponsiveActionMenu).
 * 2. **Strict (`handleOnly={true}`)** — Seule la `DrawerHandle` visible permet
 *    de fermer. Convient au contenu scrollable interactif où chaque touch
 *    compte (cart, filtres, bulk actions, long nav). Évite les fermetures
 *    accidentelles quand l'utilisateur scrolle / interagit.
 * 3. **Saisie clavier (`repositionInputs={true}`)** — Vaul repositionne l'input
 *    focusé au-dessus du clavier mobile au lieu de scroller (Vaul l'active
 *    auto si `snapPoints` est défini, sinon explicite). Convient aux drawers
 *    avec search/text input.
 */
function Drawer({
	open,
	onOpenChange,
	scrollLockTimeout = 800,
	closeThreshold = 0.15,
	handleOnly,
	repositionInputs,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & {
	/**
	 * Si `true`, seul `<DrawerHandle>` (la poignée visible en haut) permet de
	 * drag/fermer le drawer. Le reste du contenu n'écoute pas les gestes
	 * swipe-to-close. Active pour les drawers avec contenu interactif scrollable.
	 * @default false
	 */
	handleOnly?: boolean;
	/**
	 * Si `true`, Vaul repositionne l'input focusé au-dessus du clavier mobile
	 * (au lieu de scroller la page). Active pour les drawers avec saisie texte
	 * (search input, formulaire). Auto-activé si `snapPoints` est défini.
	 */
	repositionInputs?: boolean;
}) {
	const { handleClose } = useBackButtonClose({
		isOpen: open ?? false,
		onClose: () => onOpenChange?.(false),
		id: "drawer",
	});

	const wrappedOnOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			handleClose();
		} else {
			onOpenChange?.(true);
		}
	};

	// Stacking : si un Drawer/Sheet Vaul parent est déjà monté, on utilise
	// `NestedRoot` pour empiler proprement (animation scale + focus-trap chaîné).
	const isInsideVaul = useIsInsideVaul();
	const VaulRoot = isInsideVaul ? DrawerPrimitive.NestedRoot : DrawerPrimitive.Root;

	// Défauts cohérents avec le wrapper Sheet :
	// - scrollLockTimeout 800ms : évite les fermetures accidentelles juste
	//   après un scroll sur mobile (Vaul default 100ms est trop court).
	// - closeThreshold 0.15 : fraction de la hauteur du drawer à swiper pour
	//   déclencher la fermeture. Vaul default 0.25 demande ~23% de viewport
	//   sur grands drawers, trop pénible. 0.15 reste un geste volontaire.
	return (
		<VaulNestedProvider>
			<VaulRoot
				data-slot="drawer"
				open={open}
				onOpenChange={wrappedOnOpenChange}
				scrollLockTimeout={scrollLockTimeout}
				closeThreshold={closeThreshold}
				handleOnly={handleOnly}
				repositionInputs={repositionInputs}
				{...props}
			/>
		</VaulNestedProvider>
	);
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
	return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
	return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
	return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

/**
 * Handle draggable pour le drawer.
 * Quand handleOnly est activé sur le Drawer parent, seul ce composant
 * permet de drag/fermer le drawer, évitant les fermetures accidentelles.
 */
function DrawerHandle({
	className,
	"aria-label": ariaLabel = "Glisser pour fermer",
	onPointerDown,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Handle>) {
	const triggerHaptic = useHaptic();

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		// Haptic léger au début du drag (parité shop/admin "selection"-style).
		// Fire-once par pointerdown — Vaul propage l'événement même si handleOnly,
		// donc on garde la sémantique drag = feedback tactile à la prise.
		if (event.pointerType === "touch") triggerHaptic("light");
		onPointerDown?.(event);
	};

	return (
		<DrawerPrimitive.Handle
			data-slot="drawer-handle"
			aria-label={ariaLabel}
			onPointerDown={handlePointerDown}
			className={cn(
				// Visuel agrandi pour repère pouce : 8×128 (vs 6×100 avant)
				// Contraste renforcé (/35 vs /20) — affordance évidente sur fond clair/sombre
				"bg-primary/35 mx-auto mt-5 mb-1 h-2 w-32 shrink-0 rounded-full",
				"cursor-grab active:cursor-grabbing",
				// Affordance pressé — scale composé safely avec le translateY de Vaul
				"motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.97]",
				// Anneau de focus clavier — visible quand l'utilisateur tab vers la poignée
				"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				// Zone tactile étendue ~64×192px (vs ~46×132 avant) — confortable pour pouce
				"before:absolute before:-inset-x-8 before:-inset-y-7 before:content-['']",
				"relative",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerOverlay({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
	return (
		<DrawerPrimitive.Overlay
			data-slot="drawer-overlay"
			className={cn(
				"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-(--z-overlay) bg-black/50 backdrop-blur-[2px]",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Rendered inside DrawerPortal so it mounts only while the drawer is open
 * (Vaul Portal does not render children when open=false). Effect cleanup
 * runs on close → overlay-stack stays consistent.
 */
function OverlayStackRegister() {
	useRegisterOverlay();
	return null;
}

function DrawerContent({
	className,
	children,
	onOverlayClick,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
	/**
	 * Callback fired when the scrim (overlay) is tapped/clicked.
	 * Utile pour déclencher un haptic `selection` sur dismiss mobile
	 * — cohérent avec le pattern Sheet primitive.
	 */
	onOverlayClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
	return (
		<DrawerPortal data-slot="drawer-portal">
			<OverlayStackRegister />
			<DrawerOverlay onClick={onOverlayClick} />
			<DrawerPrimitive.Content
				data-slot="drawer-content"
				className={cn(
					"group/drawer-content bg-background fixed z-(--z-overlay) flex h-auto flex-col px-4 shadow-xl",
					// Top drawer
					"data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b",
					// Bottom drawer avec safe-area padding et overflow-hidden pour forcer le scroll interne
					"data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t",
					"data-[vaul-drawer-direction=bottom]:max-h-[90vh] data-[vaul-drawer-direction=bottom]:overflow-hidden data-[vaul-drawer-direction=bottom]:pb-[max(1rem,env(safe-area-inset-bottom))]",
					// Right drawer (avec safe-area latérale en mode paysage iPhone)
					"data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:pr-[max(0px,env(safe-area-inset-right))] data-[vaul-drawer-direction=right]:sm:max-w-sm",
					// Left drawer (avec safe-area latérale en mode paysage iPhone)
					"data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-full data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:pl-[max(0px,env(safe-area-inset-left))] data-[vaul-drawer-direction=left]:sm:max-w-sm",
					className,
				)}
				{...props}
			>
				{/* Handle visible uniquement pour les bottom drawers */}
				<DrawerHandle className="hidden group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
				{children}
			</DrawerPrimitive.Content>
		</DrawerPortal>
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

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
	return (
		<DrawerPrimitive.Title
			data-slot="drawer-title"
			className={cn("text-foreground font-display text-lg font-normal", className)}
			{...props}
		/>
	);
}

function DrawerDescription({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
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
	DrawerHandle,
	DrawerContent,
	DrawerHeader,
	DrawerBody,
	DrawerFooter,
	DrawerTitle,
	DrawerDescription,
};
