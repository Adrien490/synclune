"use client";

import * as React from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";

// Context pour partager l'état mobile avec les sous-composants
type ResponsiveDialogContextValue = {
	isMobile: boolean;
};

const ResponsiveDialogContext =
	React.createContext<ResponsiveDialogContextValue | null>(null);

function useResponsiveDialogContext() {
	const context = React.useContext(ResponsiveDialogContext);
	if (!context) {
		throw new Error(
			"Les composants ResponsiveDialog doivent être utilisés dans un ResponsiveDialog"
		);
	}
	return context;
}

// Props du composant racine
interface ResponsiveDialogProps {
	children: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Forcer un mode spécifique indépendamment de la taille d'écran */
	forceMode?: "dialog" | "drawer";
}

function ResponsiveDialog({
	children,
	open,
	onOpenChange,
	forceMode,
}: ResponsiveDialogProps) {
	const isMobileDetected = useIsMobile();
	const isMobile = forceMode ? forceMode === "drawer" : isMobileDetected;

	const contextValue = { isMobile };

	if (isMobile) {
		return (
			<ResponsiveDialogContext.Provider value={contextValue}>
				<Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
					{children}
				</Drawer>
			</ResponsiveDialogContext.Provider>
		);
	}

	return (
		<ResponsiveDialogContext.Provider value={contextValue}>
			<Dialog open={open} onOpenChange={onOpenChange}>
				{children}
			</Dialog>
		</ResponsiveDialogContext.Provider>
	);
}

// Props du contenu
interface ResponsiveDialogContentProps
	extends React.ComponentProps<typeof DialogContent> {}

function ResponsiveDialogContent({
	children,
	className,
	showCloseButton = true,
	...props
}: ResponsiveDialogContentProps) {
	const { isMobile } = useResponsiveDialogContext();

	if (isMobile) {
		// Filtrer les props spécifiques à Dialog avant de passer à DrawerContent
		// Ces props sont spécifiques à Radix Dialog et ne s'appliquent pas à Vaul Drawer
		const {
			onOpenAutoFocus,
			onCloseAutoFocus,
			onEscapeKeyDown,
			onPointerDownOutside,
			onInteractOutside,
			...drawerProps
		} = props;
		// Filtrer uniquement les classes max-w-* (tailles desktop)
		// Garder les classes de layout: flex, flex-col, h-*, max-h-*, overflow-*
		const filteredClassName = className
			?.split(" ")
			.filter((cls) => !cls.match(/^(sm:)?max-w-/))
			.join(" ");

		return (
			<DrawerContent
				className={cn("flex flex-col", filteredClassName)}
				{...drawerProps}
			>
				{children}
			</DrawerContent>
		);
	}

	return (
		<DialogContent
			className={cn("p-6 gap-4 max-h-[90vh] overflow-y-auto", className)}
			showCloseButton={showCloseButton}
			{...props}
		>
			{children}
		</DialogContent>
	);
}

// Header
function ResponsiveDialogHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { isMobile } = useResponsiveDialogContext();

	if (isMobile) {
		return <DrawerHeader className={cn("text-left", className)} {...props} />;
	}

	return <DialogHeader className={className} {...props} />;
}

// Footer
function ResponsiveDialogFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { isMobile } = useResponsiveDialogContext();

	if (isMobile) {
		return <DrawerFooter className={className} {...props} />;
	}

	return <DialogFooter className={className} {...props} />;
}

// Title
function ResponsiveDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogTitle>) {
	const { isMobile } = useResponsiveDialogContext();

	if (isMobile) {
		return <DrawerTitle className={className} {...props} />;
	}

	return <DialogTitle className={className} {...props} />;
}

// Description
function ResponsiveDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogDescription>) {
	const { isMobile } = useResponsiveDialogContext();

	if (isMobile) {
		return <DrawerDescription className={className} {...props} />;
	}

	return <DialogDescription className={className} {...props} />;
}

// Close
function ResponsiveDialogClose(
	props: React.ComponentProps<typeof DialogClose>
) {
	const { isMobile } = useResponsiveDialogContext();

	if (isMobile) {
		return <DrawerClose {...props} />;
	}

	return <DialogClose {...props} />;
}

// Trigger
function ResponsiveDialogTrigger(
	props: React.ComponentProps<typeof DialogTrigger>
) {
	const { isMobile } = useResponsiveDialogContext();

	if (isMobile) {
		return <DrawerTrigger {...props} />;
	}

	return <DialogTrigger {...props} />;
}

export {
	ResponsiveDialog,
	ResponsiveDialogClose,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
	useResponsiveDialogContext,
};
