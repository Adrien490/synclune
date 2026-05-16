"use client";

import { XIcon } from "lucide-react";
import * as React from "react";
import { Drawer as SheetPrimitive } from "vaul";

import { useIsInsideVaul, VaulNestedProvider } from "@/shared/components/ui/vaul-nested-context";
import { cn } from "@/shared/utils/cn";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { useRegisterOverlay } from "@/shared/hooks/use-register-overlay";

type SheetDirection = "top" | "right" | "bottom" | "left";

const SheetContext = React.createContext<{ direction: SheetDirection }>({
	direction: "right",
});

/**
 * Vaul Sheet wrapper avec défauts Synclune.
 *
 * Modes de fermeture (cf. `.claude/plans/audit-mes-modales-swipeable-linked-badger.md`) :
 *
 * 1. **Permissif (défaut)** — Swipe-from-anywhere ferme la sheet. Convient aux
 *    contenus courts / lectures simples.
 * 2. **Strict (`handleOnly={true}`)** — Seule la `SheetHandle` visible permet
 *    de fermer la sheet. Convient au contenu scrollable interactif où chaque
 *    touch compte (filtres avec sliders/accordéons/search, long nav).
 * 3. **Saisie clavier (`repositionInputs={true}`)** — Vaul repositionne l'input
 *    focusé au-dessus du clavier mobile (au lieu de scroller). Auto-activé si
 *    `snapPoints` est défini.
 */
function Sheet({
	direction = "right",
	open,
	onOpenChange,
	scrollLockTimeout = 800,
	closeThreshold = 0.15,
	handleOnly,
	repositionInputs,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Root> & {
	direction?: SheetDirection;
	/**
	 * Délai en ms après un scroll avant que le sheet redevienne draggable.
	 * Augmenté à 800ms pour éviter les fermetures accidentelles sur mobile.
	 * @default 800
	 */
	scrollLockTimeout?: number;
	/**
	 * Fraction de la hauteur du sheet à swiper pour déclencher la fermeture
	 * (Vaul default 0.25 = ~23% de viewport sur sheet 92dvh, trop exigeant
	 * sur grands drawers). 0.15 reste un geste délibéré (~14% viewport)
	 * mais beaucoup plus confortable. La fermeture par velocity (0.4) reste
	 * inchangée pour les flicks rapides.
	 * @default 0.15
	 */
	closeThreshold?: number;
	/**
	 * Si `true`, seule `<SheetHandle>` (la poignée visible) permet de drag/
	 * fermer la sheet. Le reste du contenu n'écoute pas les gestes
	 * swipe-to-close. À activer pour les sheets bottom à contenu scrollable
	 * interactif (filtres, listes longues avec search).
	 * @default false
	 */
	handleOnly?: boolean;
	/**
	 * Si `true`, Vaul repositionne l'input focusé au-dessus du clavier mobile
	 * (au lieu de scroller la page). Active pour les sheets avec saisie texte
	 * (search input, formulaire). Auto-activé si `snapPoints` est défini.
	 */
	repositionInputs?: boolean;
}) {
	// Gère uniquement le bouton retour du navigateur (mobile)
	// Les autres fermetures (X, overlay, etc.) passent directement par onOpenChange
	useBackButtonClose({
		isOpen: open ?? false,
		onClose: () => onOpenChange?.(false),
		id: "sheet",
	});

	// Stacking : si on est déjà dans un Drawer/Sheet Vaul, on monte un
	// `NestedRoot` (animation scale parent + focus-trap chaîné) au lieu d'un
	// nouveau `Root` qui écraserait le parent.
	const isInsideVaul = useIsInsideVaul();
	const VaulRoot = isInsideVaul ? SheetPrimitive.NestedRoot : SheetPrimitive.Root;

	// snapPoints, activeSnapPoint, fadeFromIndex sont forwardés via ...props
	// (types natifs de Vaul.Root — discriminated union on snapPoints presence).
	return (
		<SheetContext.Provider value={{ direction }}>
			<VaulNestedProvider>
				<VaulRoot
					data-slot="sheet"
					direction={direction}
					open={open}
					onOpenChange={onOpenChange}
					scrollLockTimeout={scrollLockTimeout}
					closeThreshold={closeThreshold}
					handleOnly={handleOnly}
					repositionInputs={repositionInputs}
					noBodyStyles
					{...props}
				/>
			</VaulNestedProvider>
		</SheetContext.Provider>
	);
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

/**
 * Handle draggable Vaul pour les bottom-sheets mobile.
 * Permet à Vaul de drag/fermer la sheet sans que le contenu interne
 * soit capturé. Rend une pill visible avec hit area étendue à 44px.
 */
function SheetHandle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Handle>) {
	return (
		<SheetPrimitive.Handle
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

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
	className,
	onClick,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
	return (
		<SheetPrimitive.Overlay
			data-slot="sheet-overlay"
			className={cn(
				"fixed inset-0 z-(--z-overlay) bg-black/50 backdrop-blur-md backdrop-saturate-150",
				"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
				"motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0",
				className,
			)}
			onClick={onClick}
			{...props}
		/>
	);
}

/**
 * Rendered inside SheetPortal so it mounts only while the sheet is open
 * (Vaul/Radix Portal does not render children when open=false). Effect
 * cleanup runs on close → overlay-stack stays consistent.
 */
function OverlayStackRegister({ enabled }: { enabled: boolean }) {
	useRegisterOverlay(enabled);
	return null;
}

function SheetContent({
	className,
	children,
	overlayClassName,
	showCloseButton = true,
	title,
	onOverlayClick,
	registerOverlay = true,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
	overlayClassName?: string;
	showCloseButton?: boolean;
	/** Accessible title for screen readers. Renders a sr-only Drawer.Title
	 * to satisfy Radix's accessibility check. */
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
	const { direction } = React.useContext(SheetContext);

	return (
		<SheetPortal>
			<OverlayStackRegister enabled={registerOverlay} />
			<SheetOverlay className={overlayClassName} onClick={onOverlayClick} />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					// Base + group pour permettre group-has-[[data-pending]]/sheet sur les descendants
					"group/sheet bg-background fixed z-(--z-overlay) flex flex-col gap-4 shadow-lg transition ease-in-out",
					// Right sheet avec safe-area latérale (mode paysage)
					direction === "right" &&
						"inset-y-0 right-0 h-full w-full border-l pr-[max(0px,env(safe-area-inset-right))] sm:max-w-sm",
					// Left sheet avec safe-area latérale (mode paysage)
					direction === "left" &&
						"inset-y-0 left-0 h-full w-full border-r pl-[max(0px,env(safe-area-inset-left))] sm:max-w-sm",
					direction === "top" &&
						"inset-x-0 top-0 h-auto border-b pt-[max(0px,env(safe-area-inset-top))]",
					direction === "bottom" &&
						"inset-x-0 bottom-0 h-auto border-t pb-[max(0px,env(safe-area-inset-bottom))]",
					className,
				)}
				{...props}
			>
				{title && <SheetPrimitive.Title className="sr-only">{title}</SheetPrimitive.Title>}
				{children}
				{showCloseButton && (
					<SheetPrimitive.Close
						aria-label="Fermer le panneau"
						className="ring-offset-background focus-visible:ring-ring data-[state=open]:bg-secondary absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 inline-flex size-11 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none"
					>
						<XIcon className="size-5" aria-hidden="true" />
						<span className="sr-only">Fermer</span>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Content>
		</SheetPortal>
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

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("text-foreground font-display text-lg font-normal", className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
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
