"use client";

import { XIcon } from "lucide-react";
import * as React from "react";
import { Drawer as SheetPrimitive } from "vaul";

import { cn } from "@/shared/utils/cn";

type SheetDirection = "top" | "right" | "bottom" | "left";

const SheetContext = React.createContext<{ direction: SheetDirection }>({
	direction: "right",
});

function Sheet({
	direction = "right",
	...props
}: React.ComponentProps<typeof SheetPrimitive.Root> & {
	direction?: SheetDirection;
}) {
	return (
		<SheetContext.Provider value={{ direction }}>
			<SheetPrimitive.Root data-slot="sheet" direction={direction} {...props} />
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
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
				className
			)}
			{...props}
		/>
	);
}

function SheetContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
	const { direction } = React.useContext(SheetContext);

	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					// Base + group pour permettre group-has-[[data-pending]]/sheet sur les descendants
					"group/sheet bg-background fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out",
					direction === "right" &&
						"inset-y-0 right-0 h-full w-full border-l sm:max-w-sm",
					direction === "left" &&
						"inset-y-0 left-0 h-full w-full border-r sm:max-w-sm",
					direction === "top" &&
						"inset-x-0 top-0 h-auto border-b",
					direction === "bottom" &&
						"inset-x-0 bottom-0 h-auto border-t",
					className
				)}
				{...props}
			>
				{children}
				<SheetPrimitive.Close className="ring-offset-background focus-visible:ring-ring data-[state=open]:bg-secondary absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 rounded-md p-2.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none">
					<XIcon className="size-5" />
					<span className="sr-only">Fermer</span>
				</SheetPrimitive.Close>
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
