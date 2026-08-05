"use client";

import * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
	Drawer,
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
	const ctx = React.use(Ctx);
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
 * Dialog responsive : Drawer Base UI (bottom, fullscreen-friendly + safe-area)
 * sur mobile, Dialog Base UI (centré) sur desktop.
 *
 * Pattern parallèle à `ResponsiveAlertDialog` pour les overlays non-destructifs
 * (forms admin, dialogs de gestion). Sur mobile, les enfants sont
 * auto-scrollables via un wrap interne ; le DrawerContent reste overflow-hidden
 * pour préserver la poignée de drag.
 */
function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
	const isMobile = useIsMobile();

	return (
		<Ctx.Provider value={{ isMobile }}>
			{isMobile ? (
				// `handleOnly` : collision de gestes constatée — le contenu de CHAQUE
				// ResponsiveDialog est un scroller vertical (`overflow-y-auto` sur le
				// wrapper de `ResponsiveDialogContent`), et un drag vertical dedans
				// refermait le panneau au lieu de le faire défiler. La fermeture au doigt
				// reste possible depuis la poignée.
				//
				// ⚠️ Cet effet était obtenu jusqu'au 2026-08-05 par un
				// `data-base-ui-swipe-ignore` posé à la main sur ce wrapper — soit
				// exactement ce que fait la prop, mais **invisible au garde-fou**, qui
				// cherche le mot `handleOnly`. La règle du dépôt paraissait respectée sur
				// tous les ResponsiveDialog du site alors qu'elle était contournée par
				// l'orthographe. Cf. `handle-only-allowlist.regression.test.ts`.
				<Drawer open={open} onOpenChange={onOpenChange} handleOnly>
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
				<div className="-mx-4 flex min-h-0 flex-1 [scrollbar-gutter:stable] flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-2">
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

// Les deux branches (Drawer mobile, Dialog desktop) sont désormais sur Base UI :
// mêmes signatures, `render` des deux côtés — plus aucune traduction à faire.

function ResponsiveDialogTitle({ className, ...props }: React.ComponentProps<typeof DrawerTitle>) {
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
}: React.ComponentProps<typeof DrawerDescription>) {
	const { isMobile } = useResponsive("ResponsiveDialogDescription");
	return isMobile ? (
		<DrawerDescription className={className} {...props} />
	) : (
		<DialogDescription className={className} {...props} />
	);
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DrawerTrigger>) {
	const { isMobile } = useResponsive("ResponsiveDialogTrigger");
	return isMobile ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />;
}

export {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
};
