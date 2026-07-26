"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";

import { buttonVariants } from "@/shared/components/ui/button";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { useRegisterOverlay } from "@/shared/hooks/use-register-overlay";
import { cn } from "@/shared/utils/cn";

function AlertDialog({
	open,
	onOpenChange,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
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

function AlertDialogTrigger({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
	return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
	return (
		<AlertDialogPrimitive.Overlay
			data-slot="alert-dialog-overlay"
			aria-hidden="true"
			className={cn(
				"bg-foreground/50 fixed inset-0 z-(--z-alert) backdrop-blur-sm",
				"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
				"motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0",
				"duration-200",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Rendu dans le Portal : il ne monte donc que pendant que la confirmation est
 * ouverte. Même motif que `SheetContent` / `DrawerContent` — sans lui, une
 * confirmation admin mobile laissait la bottom-bar visible et le pull-to-refresh
 * armé derrière elle.
 */
function OverlayStackRegister({ enabled }: { enabled: boolean }) {
	useRegisterOverlay(enabled);
	return null;
}

function AlertDialogContent({
	className,
	children,
	registerOverlay = true,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
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
			<AlertDialogPrimitive.Content
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
					"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
					"motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0",
					"motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:zoom-in-95",
					"duration-200",
					className,
				)}
				{...props}
			>
				{children}
			</AlertDialogPrimitive.Content>
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

function AlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return (
		<AlertDialogPrimitive.Title
			data-slot="alert-dialog-title"
			className={cn("text-foreground font-display text-xl font-normal", className)}
			{...props}
		/>
	);
}

function AlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			data-slot="alert-dialog-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function AlertDialogAction({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
	return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />;
}

function AlertDialogCancel({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	return (
		<AlertDialogPrimitive.Cancel
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
