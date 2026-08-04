import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/utils/cn";

const buttonVariants = cva(
	"focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground shadow-md can-hover:hover:bg-primary/90 can-hover:hover:shadow-lg active:bg-primary/75 active:shadow-sm transition-shadow",
				primary: "bg-primary text-primary-foreground can-hover:hover:bg-primary/90",
				destructive:
					"bg-destructive text-white can-hover:hover:bg-destructive/90 focus-visible:ring-destructive/20",
				outline:
					"border bg-background shadow-xs can-hover:hover:bg-accent can-hover:hover:text-accent-foreground",
				secondary: "bg-secondary text-secondary-foreground can-hover:hover:bg-secondary/80",
				ghost: "can-hover:hover:bg-accent can-hover:hover:text-accent-foreground",
				link: "text-primary underline-offset-4 can-hover:hover:underline",
			},
			size: {
				default: "h-11 px-4 py-2 has-[>svg]:px-3",
				sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
				lg: "h-12 px-6 has-[>svg]:px-4 text-base",
				icon: "size-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant,
	size,
	render,
	"aria-label": ariaLabel,
	...props
}: useRender.ComponentProps<"button"> &
	React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants>) {
	// Warning dev pour boutons icon-only sans label (WCAG 4.1.2)
	if (process.env.NODE_ENV === "development" && size === "icon" && !ariaLabel) {
		console.warn("[Button] aria-label requis pour les boutons icon-only");
	}

	// `render` remplace l'élément rendu — équivalent Base UI de l'ancien `asChild`
	// Radix. ⚠️ Les enfants restent portés par le `Button`, pas par l'élément
	// passé : `<Button render={<Link href="/x" />}>Voir</Button>`.
	// `useRender` n'appelle son unique hook (`useMergedRefs`) que si `document`
	// existe — ce module reste donc utilisable depuis un composant serveur.
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				"aria-label": ariaLabel,
				className: cn(buttonVariants({ variant, size, className })),
			},
			props,
		),
		render,
		state: { slot: "button" },
	});
}

export { Button, buttonVariants };
