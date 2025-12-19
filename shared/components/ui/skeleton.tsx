import { cn } from "@/shared/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const skeletonVariants = cva("", {
	variants: {
		variant: {
			default: "bg-accent animate-pulse",
			shimmer: "animate-shimmer",
		},
		shape: {
			rectangle: "rounded-md",
			rounded: "rounded-lg",
			circle: "rounded-full",
			text: "rounded",
		},
		size: {
			xs: "h-3",
			sm: "h-4",
			md: "h-6",
			lg: "h-8",
			xl: "h-10",
			"2xl": "h-12",
		},
	},
	defaultVariants: {
		variant: "shimmer",
		shape: "rectangle",
	},
});

interface SkeletonProps
	extends React.ComponentProps<"div">,
		VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, shape, size, ...props }: SkeletonProps) {
	return (
		<div
			data-slot="skeleton"
			role="presentation"
			aria-hidden="true"
			className={cn(skeletonVariants({ variant, shape, size }), className)}
			{...props}
		/>
	);
}

interface SkeletonGroupProps extends React.ComponentProps<"div"> {
	/** Label descriptif pour les lecteurs d'écran */
	label: string;
}

/**
 * Wrapper accessible pour groupes de skeletons.
 * Informe les lecteurs d'écran qu'un chargement est en cours.
 */
function SkeletonGroup({
	label,
	children,
	className,
	...props
}: SkeletonGroupProps) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label={label}
			className={className}
			{...props}
		>
			{children}
			<span className="sr-only">{label}</span>
		</div>
	);
}

interface SkeletonTextProps {
	/** Nombre de lignes à afficher */
	lines?: number;
	className?: string;
}

/** Skeleton pour du texte multi-lignes avec dernière ligne plus courte */
function SkeletonText({ lines = 1, className }: SkeletonTextProps) {
	return (
		<div className={cn("space-y-2", className)}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					shape="text"
					className={cn("h-4", i === lines - 1 && lines > 1 && "w-3/4")}
				/>
			))}
		</div>
	);
}

interface SkeletonAvatarProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

/** Skeleton circulaire pour les avatars */
function SkeletonAvatar({ size = "md", className }: SkeletonAvatarProps) {
	const sizeClasses = {
		sm: "size-8",
		md: "size-10",
		lg: "size-12",
	};
	return (
		<Skeleton shape="circle" className={cn(sizeClasses[size], className)} />
	);
}

interface SkeletonButtonProps {
	size?: "sm" | "default" | "lg";
	className?: string;
}

/** Skeleton pour les boutons */
function SkeletonButton({ size = "default", className }: SkeletonButtonProps) {
	const sizeClasses = {
		sm: "h-8 w-20",
		default: "h-10 w-28",
		lg: "h-12 w-36",
	};
	return (
		<Skeleton shape="rounded" className={cn(sizeClasses[size], className)} />
	);
}

export {
	Skeleton,
	SkeletonGroup,
	SkeletonText,
	SkeletonAvatar,
	SkeletonButton,
	skeletonVariants,
};
