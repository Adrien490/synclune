"use client";

import * as React from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/shared/components/ui/button";
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
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

type ResponsiveCtx = { isMobile: boolean };
const Ctx = React.createContext<ResponsiveCtx | null>(null);

function useResponsiveAlert(component: string): ResponsiveCtx {
	const ctx = React.useContext(Ctx);
	if (!ctx) {
		throw new Error(
			`${component} must be used inside <ResponsiveAlertDialog>. ` +
				`Wrap your tree with <ResponsiveAlertDialog open onOpenChange>.`,
		);
	}
	return ctx;
}

type RootProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: React.ReactNode;
};

/**
 * AlertDialog responsive : Vaul Drawer (bottom, fullscreen-friendly) sur mobile,
 * Radix AlertDialog (centré) sur desktop. API identique à `<AlertDialog>` de
 * `shared/components/ui/alert-dialog.tsx`.
 *
 * Cas d'usage : confirmations destructives bulk admin où l'AlertDialog desktop
 * était trop serré sur petit écran. Drawer mobile = drag-handle, safe-area,
 * confort one-thumb.
 */
function ResponsiveAlertDialog({ open, onOpenChange, children }: RootProps) {
	const isMobile = useIsMobile();
	const value = React.useMemo(() => ({ isMobile }), [isMobile]);

	return (
		<Ctx.Provider value={value}>
			{isMobile ? (
				<Drawer open={open} onOpenChange={onOpenChange}>
					{children}
				</Drawer>
			) : (
				<AlertDialog open={open} onOpenChange={onOpenChange}>
					{children}
				</AlertDialog>
			)}
		</Ctx.Provider>
	);
}

function ResponsiveAlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogTrigger>) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogTrigger");
	return isMobile ? <DrawerTrigger {...props} /> : <AlertDialogTrigger {...props} />;
}

function ResponsiveAlertDialogContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AlertDialogContent>) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogContent");
	if (isMobile) {
		return (
			<DrawerContent className={cn("flex max-h-[85vh] flex-col px-4", className)}>
				{children}
			</DrawerContent>
		);
	}
	return (
		<AlertDialogContent className={className} {...props}>
			{children}
		</AlertDialogContent>
	);
}

function ResponsiveAlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogHeader");
	return isMobile ? (
		<DrawerHeader className={className} {...props} />
	) : (
		<AlertDialogHeader className={className} {...props} />
	);
}

function ResponsiveAlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogTitle>) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogTitle");
	return isMobile ? (
		<DrawerTitle className={className} {...props} />
	) : (
		<AlertDialogTitle className={className} {...props} />
	);
}

function ResponsiveAlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogDescription>) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogDescription");
	return isMobile ? (
		<DrawerDescription className={className} {...props} />
	) : (
		<AlertDialogDescription className={className} {...props} />
	);
}

function ResponsiveAlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogFooter");
	if (isMobile) {
		return (
			<DrawerFooter
				className={cn(
					// Action en haut, Cancel en bas (HIG mobile : action principale visible au-dessus du fold tactile)
					"flex-col-reverse gap-2 pt-2",
					className,
				)}
				{...props}
			/>
		);
	}
	return <AlertDialogFooter className={className} {...props} />;
}

type CancelProps = React.ComponentProps<typeof AlertDialogCancel>;

function ResponsiveAlertDialogCancel({
	className,
	disabled,
	children,
	onClick,
	...props
}: CancelProps) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogCancel");
	if (isMobile) {
		return (
			<DrawerClose asChild>
				<Button
					type="button"
					variant="secondary"
					disabled={disabled}
					className={className}
					onClick={onClick}
				>
					{children}
				</Button>
			</DrawerClose>
		);
	}
	return (
		<AlertDialogCancel className={className} disabled={disabled} onClick={onClick} {...props}>
			{children}
		</AlertDialogCancel>
	);
}

type ActionProps = React.ComponentProps<typeof AlertDialogAction>;

function ResponsiveAlertDialogAction({
	className,
	disabled,
	children,
	onClick,
	type = "button",
	...props
}: ActionProps) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogAction");
	if (isMobile) {
		return (
			<Button
				type={type}
				disabled={disabled}
				className={cn(buttonVariants(), className)}
				onClick={(event) => {
					triggerHaptic("medium");
					onClick?.(event);
				}}
			>
				{children}
			</Button>
		);
	}
	return (
		<AlertDialogAction
			className={className}
			disabled={disabled}
			type={type}
			onClick={(event) => {
				triggerHaptic("medium");
				onClick?.(event);
			}}
			{...props}
		>
			{children}
		</AlertDialogAction>
	);
}

export {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
	ResponsiveAlertDialogTrigger,
};
