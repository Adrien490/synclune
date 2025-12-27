"use client";

import { XIcon } from "lucide-react";
import * as React from "react";
import { Drawer as SheetPrimitive } from "vaul";

import { cn } from "@/shared/utils/cn";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";

type SheetDirection = "top" | "right" | "bottom" | "left";

const SheetContext = React.createContext<{ direction: SheetDirection }>({
	direction: "right",
});

function Sheet({
	direction = "right",
	open,
	onOpenChange,
	scrollLockTimeout = 800,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Root> & {
	direction?: SheetDirection;
	/**
	 * Délai en ms après un scroll avant que le sheet redevienne draggable.
	 * Augmenté à 800ms pour éviter les fermetures accidentelles sur mobile.
	 * @default 800
	 */
	scrollLockTimeout?: number;
}) {
	// Gère uniquement le bouton retour du navigateur (mobile)
	// Les autres fermetures (X, overlay, etc.) passent directement par onOpenChange
	useBackButtonClose({
		isOpen: open ?? false,
		onClose: () => onOpenChange?.(false),
		id: "sheet",
	});

	return (
		<SheetContext.Provider value={{ direction }}>
			<SheetPrimitive.Root
				data-slot="sheet"
				direction={direction}
				open={open}
				onOpenChange={onOpenChange}
				scrollLockTimeout={scrollLockTimeout}
				{...props}
			/>
		</SheetContext.Provider>
	);
}

function SheetTrigger({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
	return (
		<SheetPrimitive.Overlay
			data-slot="sheet-overlay"
			className={cn(
				"fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm backdrop-saturate-150",
				"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
				"motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0",
				className
			)}
			{...props}
		/>
	);
}

function SheetContent({
	className,
	children,
	overlayClassName,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
	overlayClassName?: string;
	showCloseButton?: boolean;
}) {
	const { direction } = React.useContext(SheetContext);

	return (
		<SheetPortal>
			<SheetOverlay className={overlayClassName} />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					// Base + group pour permettre group-has-[[data-pending]]/sheet sur les descendants
					"group/sheet bg-background fixed z-[70] flex flex-col gap-4 shadow-lg transition ease-in-out",
					// Right sheet avec safe-area latérale (mode paysage)
					direction === "right" &&
						"inset-y-0 right-0 h-full w-full border-l sm:max-w-sm pr-[max(0px,env(safe-area-inset-right))]",
					// Left sheet avec safe-area latérale (mode paysage)
					direction === "left" &&
						"inset-y-0 left-0 h-full w-full border-r sm:max-w-sm pl-[max(0px,env(safe-area-inset-left))]",
					direction === "top" &&
						"inset-x-0 top-0 h-auto border-b",
					direction === "bottom" &&
						"inset-x-0 bottom-0 h-auto border-t",
					className
				)}
				{...props}
			>
				{/* Titre fallback pour accessibilité Radix - remplacé par SheetTitle si présent */}
				<SheetPrimitive.Title className="sr-only">Panneau latéral</SheetPrimitive.Title>
				{children}
				{showCloseButton && (
					<SheetPrimitive.Close className="ring-offset-background focus-visible:ring-ring data-[state=open]:bg-secondary absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 rounded-md p-3 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none">
						<XIcon className="size-5" />
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

function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("text-foreground font-semibold text-lg", className)}
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
	SheetHeader,
	SheetTitle,
	SheetTrigger,
};
