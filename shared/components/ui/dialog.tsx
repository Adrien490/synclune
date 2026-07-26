"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/cn";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { useRegisterOverlay } from "@/shared/hooks/use-register-overlay";

function Dialog({
	open,
	onOpenChange,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	// Bouton retour du navigateur (mobile) — ET reprise de l'entrée d'historique
	// sur les autres fermetures (X, scrim, Escape), sans quoi chaque cycle
	// ouvrir/fermer laissait une entrée orpheline de même URL et avalait la
	// pression suivante sur le retour matériel. Cf. use-back-button-close pour la
	// garde qui empêche de défaire une navigation en vol.
	const { handleClose } = useBackButtonClose({
		isOpen: open ?? false,
		onClose: () => onOpenChange?.(false),
		id: "dialog",
	});

	const wrappedOnOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			handleClose();
		} else {
			onOpenChange?.(true);
		}
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

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			aria-hidden="true"
			className={cn(
				"fixed inset-0 z-(--z-overlay) bg-black/50 backdrop-blur-sm backdrop-saturate-150",
				"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
				"motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Rendu dans le Portal : il ne monte donc que pendant que le dialog est ouvert
 * (Radix ne rend pas les enfants du Portal quand `open=false`). Même motif que
 * `SheetContent` / `DrawerContent` — sans lui, la bottom-bar admin restait
 * visible et le pull-to-refresh armé sous un dialog Radix.
 */
function OverlayStackRegister({ enabled }: { enabled: boolean }) {
	useRegisterOverlay(enabled);
	return null;
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	registerOverlay = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
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
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					"bg-background fixed top-[50%] left-[50%] z-(--z-overlay) grid w-full translate-x-[-50%] translate-y-[-50%] rounded-xl shadow-lg",
					// Animations avec scale + slide-in-from-bottom
					"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
					"motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0",
					"motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=open]:zoom-in-95",
					"motion-safe:data-[state=closed]:slide-out-to-top-[2%] motion-safe:data-[state=open]:slide-in-from-bottom-[2%]",
					"motion-safe:duration-200",
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
						className="ring-offset-background focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-[max(1rem,env(safe-area-inset-top))] right-4 -mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-sm opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0"
					>
						<XIcon className="size-5" aria-hidden="true" />
						<span className="sr-only">Fermer</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
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

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("font-display text-xl leading-none font-normal", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
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
