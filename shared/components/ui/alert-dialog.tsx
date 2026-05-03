"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { buttonVariants } from "@/shared/components/ui/button";
import { useIsInsideVaul, VaulNestedProvider } from "@/shared/components/ui/vaul-nested-context";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useRegisterOverlay } from "@/shared/hooks/use-register-overlay";
import { cn } from "@/shared/utils/cn";

/**
 * Responsive AlertDialog primitive.
 *
 * - Desktop (≥ md) — Radix `AlertDialog` centered, focus-trapped, `role="alertdialog"`.
 * - Mobile (< md) — Vaul `Drawer` bottom-sheet : handle drag, safe-area bottom,
 *   `data-hide-on-keyboard` so the sheet clears when the soft keyboard opens,
 *   `role="alertdialog"` preserved on the content. Prevents iOS/Android
 *   clavier-blocked confirmation flows.
 *
 * Public API (`AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, etc.)
 * is **identical** to before: every existing consumer gets the mobile
 * responsive behavior automatically, without any migration work.
 */

type Ctx = { isMobile: boolean; open: boolean; onOpenChange: (o: boolean) => void };
const AlertDialogCtx = React.createContext<Ctx | null>(null);

function useAlertDialogCtx() {
	const ctx = React.useContext(AlertDialogCtx);
	if (!ctx) {
		throw new Error("AlertDialog subcomponents must be nested within <AlertDialog>");
	}
	return ctx;
}

function AlertDialog({
	open: openProp,
	onOpenChange,
	defaultOpen,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
	const isMobile = useIsMobile();
	const isInsideVaul = useIsInsideVaul();
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
	const isControlled = openProp !== undefined;
	const open = isControlled ? !!openProp : uncontrolledOpen;

	const handleOpenChange = React.useCallback(
		(next: boolean) => {
			if (!isControlled) setUncontrolledOpen(next);
			onOpenChange?.(next);
		},
		[isControlled, onOpenChange],
	);

	// Hardware back button / swipe back integration when the drawer variant is used.
	const { handleClose } = useBackButtonClose({
		isOpen: isMobile && open,
		onClose: () => handleOpenChange(false),
		id: "alert-dialog",
	});

	const ctx: Ctx = {
		isMobile,
		open,
		onOpenChange: isMobile
			? (next) => {
					if (!next) handleClose();
					else handleOpenChange(true);
				}
			: handleOpenChange,
	};

	if (isMobile) {
		// Quand l'AlertDialog s'ouvre à l'intérieur d'un Sheet/Drawer Vaul déjà
		// monté, on utilise `Drawer.NestedRoot` pour empiler le bottom-sheet par
		// dessus le parent (scale + translate automatique, focus-trap chaîné,
		// scroll-lock cumulatif). Sinon on crée un `Drawer.Root` racine.
		const VaulRoot = isInsideVaul ? DrawerPrimitive.NestedRoot : DrawerPrimitive.Root;
		return (
			<AlertDialogCtx.Provider value={ctx}>
				<VaulNestedProvider>
					<VaulRoot
						open={open}
						onOpenChange={ctx.onOpenChange}
						direction="bottom"
						{...(props as React.ComponentProps<typeof DrawerPrimitive.Root>)}
					/>
				</VaulNestedProvider>
			</AlertDialogCtx.Provider>
		);
	}

	return (
		<AlertDialogCtx.Provider value={ctx}>
			<AlertDialogPrimitive.Root
				data-slot="alert-dialog"
				open={open}
				onOpenChange={ctx.onOpenChange}
				{...props}
			/>
		</AlertDialogCtx.Provider>
	);
}

function AlertDialogTrigger({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	const { isMobile } = useAlertDialogCtx();
	if (isMobile) {
		return <DrawerPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
	}
	return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
	const { isMobile } = useAlertDialogCtx();
	if (isMobile) {
		return <DrawerPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
	}
	return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
	const { isMobile } = useAlertDialogCtx();
	if (isMobile) {
		return (
			<DrawerPrimitive.Overlay
				data-slot="alert-dialog-overlay"
				aria-hidden="true"
				className={cn(
					"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					"fixed inset-0 z-(--z-alert) bg-black/50 backdrop-blur-[2px]",
					className,
				)}
				{...props}
			/>
		);
	}
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

function AlertDialogContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
	const { isMobile } = useAlertDialogCtx();
	useRegisterOverlay();

	if (isMobile) {
		return (
			<DrawerPrimitive.Portal data-slot="alert-dialog-portal">
				<DrawerPrimitive.Overlay
					aria-hidden="true"
					className={cn(
						"motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"fixed inset-0 z-(--z-alert) bg-black/50 backdrop-blur-[2px]",
					)}
				/>
				<DrawerPrimitive.Content
					data-slot="alert-dialog-content"
					role="alertdialog"
					data-hide-on-keyboard=""
					aria-modal="true"
					className={cn(
						"bg-card fixed inset-x-0 bottom-0 z-(--z-alert) flex flex-col",
						"border-primary/20 mt-24 max-h-[90vh] rounded-t-2xl border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl",
						"focus:outline-none",
						className,
					)}
					{...(props as React.ComponentProps<typeof DrawerPrimitive.Content>)}
				>
					<DrawerPrimitive.Handle
						data-slot="alert-dialog-handle"
						className={cn(
							"bg-primary/20 mx-auto mt-4 h-1.5 w-25 shrink-0 rounded-full",
							"cursor-grab active:cursor-grabbing",
							"before:absolute before:-inset-x-4 before:-inset-y-5 before:content-['']",
							"relative",
						)}
					/>
					<div className="flex flex-col overflow-hidden p-6">{children}</div>
				</DrawerPrimitive.Content>
			</DrawerPrimitive.Portal>
		);
	}

	return (
		<AlertDialogPortal>
			<AlertDialogOverlay />
			<AlertDialogPrimitive.Content
				data-slot="alert-dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-(--z-alert) w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 sm:max-w-105",
					"flex max-h-[calc(100dvh-4rem)] flex-col overflow-hidden",
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
			className={cn("flex shrink-0 flex-col gap-1.5 text-left", className)}
			{...props}
		/>
	);
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-dialog-footer"
			className={cn(
				"flex shrink-0 flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}

function AlertDialogBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-dialog-body"
			className={cn("-mx-6 flex-1 overflow-y-auto px-6 py-4", className)}
			{...props}
		/>
	);
}

function AlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	const { isMobile } = useAlertDialogCtx();
	if (isMobile) {
		return (
			<DrawerPrimitive.Title
				data-slot="alert-dialog-title"
				className={cn("text-foreground font-display text-xl font-normal", className)}
				{...props}
			/>
		);
	}
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
	const { isMobile } = useAlertDialogCtx();
	if (isMobile) {
		return (
			<DrawerPrimitive.Description
				data-slot="alert-dialog-description"
				className={cn("text-muted-foreground text-sm", className)}
				{...props}
			/>
		);
	}
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
	const { isMobile, onOpenChange } = useAlertDialogCtx();
	if (isMobile) {
		// Vaul has no action primitive; wrap a button that closes the sheet.
		const { onClick, ...rest } = props;
		return (
			<button
				className={cn(buttonVariants(), className)}
				onClick={(e) => {
					onClick?.(e);
					if (!e.defaultPrevented) onOpenChange(false);
				}}
				{...rest}
			/>
		);
	}
	return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />;
}

function AlertDialogCancel({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	const { isMobile, onOpenChange } = useAlertDialogCtx();
	if (isMobile) {
		const { onClick, ...rest } = props;
		return (
			<button
				className={cn(buttonVariants({ variant: "secondary" }), className)}
				onClick={(e) => {
					onClick?.(e);
					if (!e.defaultPrevented) onOpenChange(false);
				}}
				{...rest}
			/>
		);
	}
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
	AlertDialogBody,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
};
