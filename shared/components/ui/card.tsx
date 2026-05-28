import { cn } from "@/shared/utils/cn";
import * as React from "react";

function Card({
	className,
	interactive = false,
	...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
	return (
		<div
			data-slot="card"
			className={cn(
				// Container query context pour layouts adaptatifs enfants
				"@container/card",
				// Mobile (< md): rendu flat type iOS Settings (no border/shadow/rounded)
				// Desktop (>= md): Card classique
				"bg-card text-card-foreground flex flex-col gap-6 rounded-none border-0 py-4 shadow-none md:rounded-xl md:border md:py-6 md:shadow-md",
				interactive &&
					"focus-visible:ring-ring can-hover:md:hover:shadow-lg cursor-pointer transition-shadow focus-visible:ring-2 focus-visible:ring-offset-2",
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				"@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-[var(--admin-main-x,1rem)] has-data-[slot=card-action]:grid-cols-[1fr_auto] md:px-6 [.border-b]:pb-6",
				className,
			)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-title"
			className={cn(
				// Mobile : label SECTION iOS Settings
				// Desktop : titre Card classique font-display
				"text-muted-foreground md:text-foreground md:font-display text-xs font-medium tracking-wider uppercase md:text-lg md:leading-none md:font-normal md:tracking-normal md:normal-case",
				className,
			)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-content"
			className={cn("px-[var(--admin-main-x,1rem)] md:px-6", className)}
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				"flex items-center gap-3 px-[var(--admin-main-x,1rem)] md:px-6 [.border-t]:pt-6",
				className,
			)}
			{...props}
		/>
	);
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
