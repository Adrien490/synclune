"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/cn";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { OverlayStackRegister } from "@/shared/components/ui/overlay-stack-register";

/**
 * `onOpenChange` de Base UI reçoit un second argument `eventDetails` et le
 * REND obligatoire à l'appel. Aucun appelant n'en a besoin, et nos fermetures
 * synthétiques (retour matériel) n'ont pas d'événement à fournir : on re-type
 * le prop à un seul paramètre. Idem pour `className`, que Base UI autorise en
 * fonction de l'état — `DialogContent` doit pouvoir l'inspecter (`max-w-`).
 */
type DialogProps = Omit<DialogPrimitive.Root.Props, "onOpenChange"> & {
	onOpenChange?: (open: boolean, eventDetails?: DialogPrimitive.Root.ChangeEventDetails) => void;
};

function Dialog({ open, onOpenChange, ...props }: DialogProps) {
	// Bouton retour du navigateur (mobile) — ET reprise de l'entrée d'historique
	// sur les autres fermetures (X, scrim, Escape), sans quoi chaque cycle
	// ouvrir/fermer laissait une entrée orpheline de même URL et avalait la
	// pression suivante sur le retour matériel. Cf. use-back-button-close pour la
	// garde qui empêche de défaire une navigation en vol.
	//
	// `open`/`onOpenChange` ont la même sémantique chez Base UI que chez Radix :
	// ce câblage traverse la migration sans changement (Base UI ajoute seulement
	// un second argument `eventDetails`, qu'on ignore).
	// `handleClose()` fait DEUX choses : consommer l'entrée d'historique, puis
	// notifier via `onClose`. Or Base UI laisse l'appelant annuler une fermeture
	// (`eventDetails.cancel()`, lu juste après notre retour) — il faut donc le
	// consulter AVANT de toucher à l'historique, alors que `onClose` n'est appelé
	// qu'après. D'où cette garde : on notifie nous-mêmes en premier, et on
	// neutralise la notification redondante de `handleClose`. Le chemin
	// « retour matériel » (popstate), lui, continue de passer par `onClose`.
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
		id: "dialog",
	});

	const wrappedOnOpenChange = (
		newOpen: boolean,
		eventDetails: DialogPrimitive.Root.ChangeEventDetails,
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

	return (
		<DialogPrimitive.Root
			data-slot="dialog"
			open={open}
			onOpenChange={wrappedOnOpenChange}
			{...props}
		/>
	);
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** `Backdrop` chez Base UI — le nom public reste `DialogOverlay`. */
function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-overlay"
			aria-hidden="true"
			className={cn(
				"fixed inset-0 z-(--z-overlay) bg-black/50 backdrop-blur-sm backdrop-saturate-150",
				"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out",
				"motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0",
				// Durée ALIGNÉE sur celle du popup (cf. le commentaire de fond sur
				// `fill-mode-forwards` plus bas) : sans elle le scrim retombait sur le
				// défaut 150 ms de tw-animate-css pendant que le popup animait 200 ms.
				"fill-mode-forwards motion-safe:duration-200",
				className,
			)}
			{...props}
		/>
	);
}

/** `Popup` chez Base UI — le nom public reste `DialogContent`. */
function DialogContent({
	className,
	children,
	showCloseButton = true,
	registerOverlay = true,
	...props
}: Omit<DialogPrimitive.Popup.Props, "className"> & {
	className?: string;
	showCloseButton?: boolean;
	/**
	 * Quand `false`, ce dialog ne s'empile pas sur la pile d'overlays globale :
	 * l'UI ancrée en bas (AdminMobileBottomBar) reste visible derrière lui.
	 * @default true
	 */
	registerOverlay?: boolean;
}) {
	// Si className contient une classe max-w-*, on ne met pas la classe par défaut sm:max-w-lg
	const hasMaxWidth = className?.includes("max-w-");

	return (
		<DialogPortal data-slot="dialog-portal">
			<OverlayStackRegister enabled={registerOverlay} />
			<DialogOverlay />
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				className={cn(
					"bg-background fixed top-[50%] left-[50%] z-(--z-overlay) grid w-full translate-x-[-50%] translate-y-[-50%] rounded-xl shadow-lg",
					// Animations avec scale + slide-in-from-bottom
					"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out",
					"motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0",
					"motion-safe:data-closed:zoom-out-95 motion-safe:data-open:zoom-in-95",
					"motion-safe:data-closed:slide-out-to-top-[2%] motion-safe:data-open:slide-in-from-bottom-[2%]",
					"motion-safe:duration-200",
					// ⚠️ `animate-out` est INUTILISABLE sans fill mode. Les keyframes
					// `exit` de tw-animate-css n'ont qu'un `to` (`opacity: 0`), et le
					// raccourci `animation` fixe `fill-mode: none` : à la fin de
					// l'animation l'élément REVIENT à son style de base — c'est-à-dire
					// pleinement visible. `animate-in` n'a pas ce défaut (ses keyframes
					// n'ont qu'un `from`, l'état final EST le style de base), d'où un bug
					// qui ne se manifestait qu'à la fermeture.
					"fill-mode-forwards",
					!hasMaxWidth && "max-w-[90%] sm:max-w-lg",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						aria-label="Fermer la boîte de dialogue"
						className="focus-ring absolute top-[max(1rem,env(safe-area-inset-top))] right-4 -mr-2 flex size-11 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0"
					>
						<XIcon className="size-5" aria-hidden="true" />
						<span className="sr-only">Fermer</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Popup>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("font-display text-xl leading-none font-normal", className)}
			{...props}
		/>
	);
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
};
