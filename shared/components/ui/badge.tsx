import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

/** @public Surface du kit shadcn/ui vendored (composition par variants) — exempté du rapport knip. */
export const badgeVariants = cva(
	"inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-ring aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-primary text-primary-foreground [a&]:can-hover:hover:bg-primary/90",
				secondary:
					"border-transparent bg-secondary text-secondary-foreground [a&]:can-hover:hover:bg-secondary/90",
				destructive:
					"border-transparent bg-destructive text-white [a&]:can-hover:hover:bg-destructive/90 focus-visible:ring-destructive/20",
				success:
					"border-transparent bg-success text-success-foreground [a&]:can-hover:hover:bg-success/90",
				warning:
					"border-transparent bg-warning text-warning-foreground [a&]:can-hover:hover:bg-warning/90",
				outline:
					"text-foreground [a&]:can-hover:hover:bg-accent [a&]:can-hover:hover:text-accent-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge };
