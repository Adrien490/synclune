import { cn } from "@/shared/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const emptyVariants = cva(
	"flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg text-center text-balance transition-all duration-500 ease-out animate-in fade-in-0 slide-in-from-bottom-4",
	{
		variants: {
			variant: {
				default: "border border-dashed border-border",
			},
			size: {
				sm: "gap-4 p-4 xs:p-5 md:p-6",
				default: "gap-5 p-4 xs:p-6 md:gap-6 md:p-12",
				lg: "gap-6 p-6 xs:p-8 md:gap-8 md:p-16",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

type EmptyProps = React.ComponentProps<"div"> &
	VariantProps<typeof emptyVariants>;

function Empty({
	className,
	variant = "default",
	size = "default",
	role = "status",
	...props
}: EmptyProps) {
	return (
		<div
			role={role}
			data-slot="empty"
			data-variant={variant}
			data-size={size}
			className={cn(emptyVariants({ variant, size, className }))}
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
	"flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 transition-all duration-300 animate-sparkle-pulse",
	{
		variants: {
			variant: {
				default:
					"bg-primary/10 text-primary size-14 rounded-full ring-1 ring-primary/20 [&_svg:not([class*='size-'])]:size-7",
				icon: "bg-primary/10 text-primary size-12 rounded-xl border border-primary/20 [&_svg:not([class*='size-'])]:size-6",
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
			aria-hidden="true"
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
				"font-display text-xl xs:text-2xl font-medium tracking-tight text-foreground",
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
				"flex flex-col xs:flex-row flex-wrap items-center justify-center gap-3 mt-2 w-full xs:w-auto",
				"[&_button]:min-h-11 [&_a]:min-h-11 [&_button]:w-full [&_a]:w-full xs:[&_button]:w-auto xs:[&_a]:w-auto",
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
