"use client";

import * as React from "react";
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
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";

type ResponsiveCtx = { isMobile: boolean };
const Ctx = React.createContext<ResponsiveCtx | null>(null);

function useResponsive(component: string): ResponsiveCtx {
	const ctx = React.useContext(Ctx);
	if (!ctx) {
		throw new Error(
			`${component} must be used inside <ResponsiveDialog>. ` +
				`Wrap your tree with <ResponsiveDialog open onOpenChange>.`,
		);
	}
	return ctx;
}

interface ResponsiveDialogProps {
	children: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog responsive : Vaul Drawer (bottom, fullscreen-friendly + safe-area)
 * sur mobile, Radix Dialog (centré) sur desktop. API miroir du Dialog Radix.
 *
 * Pattern parallèle à `ResponsiveAlertDialog` pour les overlays non-destructifs
 * (forms admin, dialogs de gestion). Sur mobile, les enfants sont
 * auto-scrollables via un wrap interne ; le DrawerContent reste overflow-hidden
 * pour préserver le swipe-to-close et le drag-handle natifs.
 */
function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
	const isMobile = useIsMobile();
	const value = React.useMemo(() => ({ isMobile }), [isMobile]);

	return (
		<Ctx.Provider value={value}>
			{isMobile ? (
				<Drawer open={open} onOpenChange={onOpenChange}>
					{children}
				</Drawer>
			) : (
				<Dialog open={open} onOpenChange={onOpenChange}>
					{children}
				</Dialog>
			)}
		</Ctx.Provider>
	);
}

interface ResponsiveDialogContentProps extends React.ComponentProps<typeof DialogContent> {}

function ResponsiveDialogContent({
	children,
	className,
	showCloseButton = true,
	style,
	...props
}: ResponsiveDialogContentProps) {
	const { isMobile } = useResponsive("ResponsiveDialogContent");

	if (isMobile) {
		// Style overrides pour `AdminFormFooter` à l'intérieur du drawer :
		//  --bottom-bar-height : -safe-area  → annule l'offset bottom-bar
		//    (la bottom-bar admin n'est pas derrière l'overlay) tout en
		//    laissant Vaul gérer la safe-area via son pb-safe intrinsèque.
		//    Résultat : footer sticky au ras de la zone visible du drawer.
		//  --admin-main-x : 1rem → aligne `-mx-[var(--admin-main-x)]` du
		//    footer avec le px-4 du DrawerContent (sinon overflow horizontal).
		const overlayStyle = {
			...(style as React.CSSProperties | undefined),
			"--bottom-bar-height": "calc(env(safe-area-inset-bottom) * -1)",
			"--admin-main-x": "1rem",
		} as React.CSSProperties;

		return (
			<DrawerContent
				className={cn(className)}
				style={overlayStyle}
				{...(props as React.ComponentProps<typeof DrawerContent>)}
			>
				<div className="-mx-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-2 [scrollbar-gutter:stable]">
					{children}
				</div>
			</DrawerContent>
		);
	}

	return (
		<DialogContent
			className={cn("max-h-[90vh] gap-4 overflow-y-auto p-6", className)}
			showCloseButton={showCloseButton}
			style={style}
			{...props}
		>
			{children}
		</DialogContent>
	);
}

function ResponsiveDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	const { isMobile } = useResponsive("ResponsiveDialogHeader");
	return isMobile ? (
		<DrawerHeader className={className} {...props} />
	) : (
		<DialogHeader className={className} {...props} />
	);
}

function ResponsiveDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	const { isMobile } = useResponsive("ResponsiveDialogFooter");
	return isMobile ? (
		<DrawerFooter className={className} {...props} />
	) : (
		<DialogFooter className={className} {...props} />
	);
}

function ResponsiveDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
	const { isMobile } = useResponsive("ResponsiveDialogTitle");
	return isMobile ? (
		<DrawerTitle className={className} {...props} />
	) : (
		<DialogTitle className={className} {...props} />
	);
}

function ResponsiveDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogDescription>) {
	const { isMobile } = useResponsive("ResponsiveDialogDescription");
	return isMobile ? (
		<DrawerDescription className={className} {...props} />
	) : (
		<DialogDescription className={className} {...props} />
	);
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
	const { isMobile } = useResponsive("ResponsiveDialogClose");
	return isMobile ? <DrawerClose {...props} /> : <DialogClose {...props} />;
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
	const { isMobile } = useResponsive("ResponsiveDialogTrigger");
	return isMobile ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />;
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
};
