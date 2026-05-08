"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";

import { buttonVariants } from "@/shared/components/ui/button";
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close";
import { cn } from "@/shared/utils/cn";

function AlertDialog({
	open,
	onOpenChange,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
	useBackButtonClose({
		isOpen: open ?? false,
		onClose: () => onOpenChange?.(false),
		id: "alert-dialog",
	});

	return (
		<AlertDialogPrimitive.Root
			data-slot="alert-dialog"
			open={open}
			onOpenChange={onOpenChange}
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

function AlertDialogContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
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
	AlertDialogBody,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
};
