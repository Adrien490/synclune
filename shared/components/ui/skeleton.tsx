import { cn } from "@/shared/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const skeletonVariants = cva("rounded-md", {
	variants: {
		variant: {
			default: "bg-accent animate-pulse",
			shimmer: "animate-shimmer",
		},
	},
	defaultVariants: {
		variant: "shimmer",
	},
});

interface SkeletonProps
	extends React.ComponentProps<"div">,
		VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, ...props }: SkeletonProps) {
	return (
		<div
			data-slot="skeleton"
			className={cn(skeletonVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Skeleton, skeletonVariants };
