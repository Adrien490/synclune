"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type * as React from "react";

import { buttonVariants } from "@/shared/components/ui/button";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { OverlayStackRegister } from "@/shared/components/ui/overlay-stack-register";
import { cn } from "@/shared/utils/cn";

/** Même re-typage à un paramètre que `Dialog` — cf. le commentaire là-bas. */
type AlertDialogProps = Omit<AlertDialogPrimitive.Root.Props, "onOpenChange"> & {
	onOpenChange?: (open: boolean) => void;
};

function AlertDialog({ open, onOpenChange, ...props }: AlertDialogProps) {
	// Bouton retour du navigateur (mobile) — ET reprise de l'entrée d'historique
	// sur les autres fermetures (Annuler, Escape), sans quoi chaque confirmation
	// affichée puis annulée laissait une entrée orpheline de même URL et avalait
	// la pression suivante sur le retour matériel.
	const { handleClose } = useBackButtonClose({
		isOpen: open ?? false,
		onClose: () => onOpenChange?.(false),
		id: "alert-dialog",
	});

	const wrappedOnOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			handleClose();
		} else {
			onOpenChange?.(true);
		}
	};

	return (
		<AlertDialogPrimitive.Root
			data-slot="alert-dialog"
			open={open}
			onOpenChange={wrappedOnOpenChange}
			{...props}
		/>
	);
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
	return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
	return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

/** `Backdrop` chez Base UI — le nom public reste `AlertDialogOverlay`. */
function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props) {
	return (
		<AlertDialogPrimitive.Backdrop
			data-slot="alert-dialog-overlay"
			aria-hidden="true"
			className={cn(
				"fixed inset-0 z-(--z-alert) bg-black/50 backdrop-blur-sm backdrop-saturate-150",
				"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out",
				"motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0",
				// `fill-mode-forwards` : cf. le commentaire de `ui/dialog.tsx`. Ici les
				// deux durées coïncidaient déjà (200/200), donc pas de clignotement
				// constaté — mais rien ne le garantissait, et un `duration-*` changé
				// d'un seul côté suffisait à le rouvrir.
				"fill-mode-forwards duration-200",
				className,
			)}
			{...props}
		/>
	);
}

/** `Popup` chez Base UI — le nom public reste `AlertDialogContent`. */
function AlertDialogContent({
	className,
	children,
	registerOverlay = true,
	...props
}: AlertDialogPrimitive.Popup.Props & {
	/**
	 * Quand `false`, cette confirmation ne s'empile pas sur la pile d'overlays
	 * globale (l'UI ancrée en bas reste visible derrière elle).
	 * @default true
	 */
	registerOverlay?: boolean;
}) {
	return (
		<AlertDialogPortal>
			<OverlayStackRegister enabled={registerOverlay} />
			<AlertDialogOverlay />
			<AlertDialogPrimitive.Popup
				data-slot="alert-dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-(--z-alert) w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 sm:max-w-105",
					// `overflow-y-auto`, PAS `overflow-hidden` : sous `max-h`, un contenu
					// trop haut (zoom texte 200%, paysage mobile, description longue)
					// débordait sans scroll et se faisait couper. Le footer étant le
					// dernier enfant, ce sont les boutons Annuler/Confirmer qui
					// sortaient de l'écran — confirmation destructive inutilisable
					// (audit responsive 2026-07-26). Le scroll est porté par le Content
					// et non par un enfant : plusieurs callsites enveloppent header +
					// footer dans un `<form>` (cf. delete-confirmation-dialog), donc
					// aucune structure interne ne peut être présumée. Même contrat que
					// `DialogContent` (`max-h-[90vh] overflow-y-auto`).
					"max-h-[calc(100dvh-4rem)] overflow-y-auto",
					"bg-card",
					"border-primary/20 rounded-xl border",
					"shadow-xl",
					"p-6",
					"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out",
					"motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0",
					"motion-safe:data-closed:zoom-out-95 motion-safe:data-open:zoom-in-95",
					"fill-mode-forwards duration-200",
					className,
				)}
				{...props}
			>
				{children}
			</AlertDialogPrimitive.Popup>
		</AlertDialogPortal>
	);
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-dialog-header"
			className={cn("flex flex-col gap-1.5 text-left", className)}
			{...props}
		/>
	);
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-dialog-footer"
			className={cn("flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", className)}
			{...props}
		/>
	);
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
	return (
		<AlertDialogPrimitive.Title
			data-slot="alert-dialog-title"
			className={cn("text-foreground font-display text-xl font-normal", className)}
			{...props}
		/>
	);
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
	return (
		<AlertDialogPrimitive.Description
			data-slot="alert-dialog-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

/**
 * ⚠️ Base UI n'a ni `Action` ni `Cancel` : les deux sont des `Close`. La
 * distinction n'est plus que visuelle (et sémantique pour l'appelant), ce qui a
 * une conséquence a11y — Radix donnait le focus initial au `Cancel`, garde-fou
 * classique d'une confirmation destructive. Les `data-slot` distincts et l'ordre
 * DOM (Cancel AVANT Action) portent désormais seuls cet invariant, verrouillé
 * par `alert-dialog-initial-focus.regression.test.tsx`.
 */
function AlertDialogAction({ className, ...props }: AlertDialogPrimitive.Close.Props) {
	return (
		<AlertDialogPrimitive.Close
			data-slot="alert-dialog-action"
			className={cn(buttonVariants(), className)}
			{...props}
		/>
	);
}

function AlertDialogCancel({ className, ...props }: AlertDialogPrimitive.Close.Props) {
	return (
		<AlertDialogPrimitive.Close
			data-slot="alert-dialog-cancel"
			className={cn(buttonVariants({ variant: "secondary" }), className)}
			{...props}
		/>
	);
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
};
