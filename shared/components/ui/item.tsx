import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/shared/utils/cn";
import { Separator } from "@/shared/components/ui/separator";

/**
 * Conteneur de liste. `<ul>` natif (et non `<div role="list">`) : les lecteurs
 * d'écran dérivent des sémantiques plus fiables du tag que du rôle ARIA.
 * `role="list"` est conservé explicitement car iOS Safari + VoiceOver retirent
 * le rôle implicite dès que `list-style: none` s'applique (reset Tailwind).
 *
 * ⚠️ Les enfants directs doivent être des `<li>` (HTML valide).
 */
function ItemGroup({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		// eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VoiceOver retirent le rôle implicite quand list-style:none s'applique
		<ul
			role="list"
			data-slot="item-group"
			className={cn("group/item-group flex flex-col", className)}
			{...props}
		/>
	);
}

function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="item-separator"
			orientation="horizontal"
			className={cn("my-0", className)}
			{...props}
		/>
	);
}

const itemVariants = cva(
	[
		"group/item flex items-center border border-transparent text-sm rounded-md flex-wrap",
		// Container query scope: children can adapt to item's own width (@md:, @lg:, ...)
		"@container/item",
		"transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out",
		"focus-ring",
		// Mobile touch: disable 300ms tap delay + iOS tap highlight (we provide our own feedback)
		"touch-manipulation [-webkit-tap-highlight-color:transparent]",
		// Desktop hover (existing behaviour preserved for asChild <a>)
		"[a]:hover:bg-accent/50 [a]:transition-colors",
		// Press feedback: Item-as-link (asChild) + any descendant link tapped
		"[a]:active:bg-accent/70 active:scale-[0.985] active:shadow-xs",
		"has-[a:active]:bg-accent/40 has-[a:active]:scale-[0.985] has-[a:active]:shadow-xs",
		// Respect reduced-motion users
		"motion-reduce:transition-[background-color,border-color,box-shadow]",
		"motion-reduce:active:scale-100 motion-reduce:has-[a:active]:scale-100",
	].join(" "),
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline: "border-border",
			},
			size: {
				default: "p-4 gap-4 ",
				sm: "py-3 px-4 gap-2.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Item({
	className,
	variant = "default",
	size = "default",
	render,
	...props
}: useRender.ComponentProps<"div"> &
	React.ComponentProps<"div"> &
	VariantProps<typeof itemVariants>) {
	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">({ className: cn(itemVariants({ variant, size, className })) }, props),
		render,
		state: { slot: "item", variant, size },
	});
}

const itemMediaVariants = cva(
	"flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4",
				image: "size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function ItemMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
	return (
		<div
			data-slot="item-media"
			data-variant={variant}
			className={cn(itemMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="item-content"
			className={cn("flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", className)}
			{...props}
		/>
	);
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="item-title"
			className={cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", className)}
			{...props}
		/>
	);
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="item-description"
			className={cn(
				"text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance",
				"[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
				className,
			)}
			{...props}
		/>
	);
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="item-actions" className={cn("flex items-center gap-2", className)} {...props} />
	);
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="item-header"
			className={cn("flex basis-full items-center justify-between gap-2", className)}
			{...props}
		/>
	);
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="item-footer"
			className={cn("flex basis-full items-center justify-between gap-2", className)}
			{...props}
		/>
	);
}

export {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
};
