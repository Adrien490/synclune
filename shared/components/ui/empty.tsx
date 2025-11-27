import { cn } from "@/shared/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const emptyVariants = cva(
	"flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg p-6 text-center text-balance md:p-12 transition-all duration-500 ease-out animate-in fade-in-0 slide-in-from-bottom-4",
	{
		variants: {
			variant: {
				default: "border border-dashed border-border",
				jewelry: "border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-secondary/10 backdrop-blur-sm",
				luxury: "bg-gradient-organic border border-primary/20 shadow-lg",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

function Empty({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyVariants>) {
	return (
		<div
			data-slot="empty"
			data-variant={variant}
			className={cn(emptyVariants({ variant, className }))}
			{...props}
		/>
	);
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-header"
			className={cn(
				"flex max-w-md flex-col items-center gap-3 text-center",
				className
			)}
			{...props}
		/>
	);
}

const emptyMediaVariants = cva(
	"flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 transition-transform duration-300",
	{
		variants: {
			variant: {
				default: "bg-transparent [&_svg:not([class*='size-'])]:size-8",
				icon: "bg-muted text-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-7 hover:scale-105",
				jewelry: "bg-primary/10 text-primary flex size-16 shrink-0 items-center justify-center rounded-full [&_svg:not([class*='size-'])]:size-9 animate-sparkle-pulse shadow-md shadow-primary/20",
				luxury: "bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex size-20 shrink-0 items-center justify-center rounded-2xl [&_svg:not([class*='size-'])]:size-10 hover:scale-105 shadow-xl shadow-primary/10",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

function EmptyMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
	return (
		<div
			data-slot="empty-icon"
			data-variant={variant}
			className={cn(emptyMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"h3">) {
	return (
		<h3
			data-slot="empty-title"
			className={cn(
				"font-display text-2xl font-semibold tracking-tight text-foreground",
				className
			)}
			{...props}
		/>
	);
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="empty-description"
			className={cn(
				"text-muted-foreground text-sm/relaxed max-w-sm [&>a]:text-primary [&>a]:underline [&>a]:decoration-primary/30 [&>a]:underline-offset-4 [&>a:hover]:text-primary/80 [&>a]:transition-colors",
				className
			)}
			{...props}
		/>
	);
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-content"
			className={cn(
				"flex w-full max-w-md min-w-0 flex-col items-center gap-4 text-sm text-balance",
				className
			)}
			{...props}
		/>
	);
}

function EmptyActions({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-actions"
			className={cn(
				"flex flex-wrap items-center justify-center gap-3 mt-2",
				className
			)}
			{...props}
		/>
	);
}

export {
	Empty,
	EmptyActions,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
};
