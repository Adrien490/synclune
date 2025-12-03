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
} from "./dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "./drawer";

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

	const contextValue = React.useMemo(() => ({ isMobile }), [isMobile]);

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
	extends React.ComponentProps<typeof DialogContent> {
	/** Préserver un espace pour la bottom-nav sur mobile */
	bottomInset?: boolean;
}

function ResponsiveDialogContent({
	children,
	className,
	bottomInset = true, // Par défaut true pour préserver l'espace de la bottom-nav
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
		// Note: On n'applique pas className au DrawerContent car il contient
		// souvent des max-width (sm:max-w-[500px]) destinées au Dialog desktop.
		// Le drawer doit toujours être pleine largeur sur mobile.
		return (
			<DrawerContent
				className="px-4 pb-6"
				bottomInset={bottomInset}
				{...drawerProps}
			>
				{children}
			</DrawerContent>
		);
	}

	return (
		<DialogContent
			className={cn("max-h-[90vh] overflow-y-auto", className)}
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
