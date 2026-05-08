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
import { cn } from "@/shared/utils/cn";

interface ResponsiveDialogProps {
	children: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{children}
		</Dialog>
	);
}

interface ResponsiveDialogContentProps extends React.ComponentProps<typeof DialogContent> {}

function ResponsiveDialogContent({
	children,
	className,
	showCloseButton = true,
	...props
}: ResponsiveDialogContentProps) {
	return (
		<DialogContent
			className={cn("max-h-[90vh] gap-4 overflow-y-auto p-6", className)}
			showCloseButton={showCloseButton}
			{...props}
		>
			{children}
		</DialogContent>
	);
}

function ResponsiveDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <DialogHeader className={className} {...props} />;
}

function ResponsiveDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return <DialogFooter className={className} {...props} />;
}

function ResponsiveDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
	return <DialogTitle className={className} {...props} />;
}

function ResponsiveDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogDescription>) {
	return <DialogDescription className={className} {...props} />;
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
	return <DialogClose {...props} />;
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
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
};
