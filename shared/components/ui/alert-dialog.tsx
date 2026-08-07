"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type * as React from "react";

import { buttonVariants } from "@/shared/components/ui/button";
import { triggerHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
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
			// ⚠️ `forceRender` n'est PAS décoratif : Base UI n'active un `Backdrop`
			// que sur `forceRender || !nested` (`dialog/backdrop/DialogBackdrop.js`),
			// et `nested` vaut vrai dès qu'un `DialogRootContext` parent existe —
			// donc pour TOUTE confirmation rendue dans l'arbre JSX d'une Sheet, d'un
			// Drawer ou d'un Dialog, ce qui est la convention du dépôt (« un overlay
			// enfant se rend DANS l'arbre du parent »). Sans lui, la confirmation
			// destructive du panier ou du panneau de filtres s'affichait SANS scrim :
			// le panneau restait net et à pleine luminosité sous elle, et rien ne
			// signalait qu'il n'était plus interactif. Le scrim du parent, lui, ne
			// couvre que la page — jamais le panneau.
			forceRender
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
 * Tonalité de l'action de confirmation. Pilote sa couleur ET son pattern haptic.
 *
 * ⚠️ `info` et `neutral` rendent la MÊME apparence (chaîne vide : le bouton
 * garde le `buttonVariants()` par défaut) mais vibrent différemment — ne pas les
 * fusionner « puisque c'est pareil », c'est un arbitrage produit sur l'haptique.
 * Verrouillé par `alert-dialog-tone.regression.test.tsx`.
 */
export type AlertActionTone = "destructive" | "warning" | "info" | "success" | "neutral";

const TONE_CLASSES: Record<AlertActionTone, string> = {
	destructive: "bg-destructive text-white can-hover:hover:bg-destructive/90",
	warning: "bg-warning text-warning-foreground can-hover:hover:bg-warning/90",
	info: "",
	success: "bg-success text-success-foreground can-hover:hover:bg-success/90",
	neutral: "",
};

const TONE_HAPTIC: Record<AlertActionTone, HapticPattern> = {
	destructive: "heavy",
	warning: "medium",
	info: "light",
	success: "success",
	neutral: "medium",
};

/**
 * ⚠️ Base UI n'a ni `Action` ni `Cancel` : les deux sont des `Close`. La
 * distinction n'est plus que visuelle (et sémantique pour l'appelant), ce qui a
 * une conséquence a11y — Radix donnait le focus initial au `Cancel`, garde-fou
 * classique d'une confirmation destructive. Les `data-slot` distincts et l'ordre
 * DOM (Cancel AVANT Action) portent désormais seuls cet invariant, verrouillé
 * par `alert-dialog-initial-focus.regression.test.tsx`.
 *
 * ⚠️ Ce bouton FERME le dialog au clic (c'est un `Close`), avant même que la
 * mutation ne démarre — cf. `alert-dialog-close-on-confirm.regression.test.tsx`.
 * Deux corollaires : un libellé d'attente ou un spinner piloté par `isPending`
 * n'est jamais vu, et une validation HTML (`required`) posée dans le formulaire
 * ne peut pas être rapportée à l'utilisatrice. Une garde de validation se pose
 * en `disabled` sur cette action.
 *
 * ⚠️ `tone` n'a volontairement PAS de défaut : les confirmations qui montent la
 * primitive nue (rail de filtres, panneau de filtres, garde de navigation) n'ont
 * aucune vibration aujourd'hui, et un défaut leur en ajouterait une en silence.
 */
function AlertDialogAction({
	className,
	tone,
	onClick,
	...props
}: AlertDialogPrimitive.Close.Props & { tone?: AlertActionTone }) {
	return (
		<AlertDialogPrimitive.Close
			data-slot="alert-dialog-action"
			data-tone={tone}
			className={cn(buttonVariants(), tone && TONE_CLASSES[tone], className)}
			onClick={(event) => {
				if (tone) triggerHaptic(TONE_HAPTIC[tone]);
				onClick?.(event);
			}}
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
