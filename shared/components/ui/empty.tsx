import { cn } from "@/shared/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const emptyVariants = cva(
	"flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg text-center text-balance transition-all duration-500 ease-out motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4",
	{
		variants: {
			variant: {
				default: "border border-dashed border-border",
				borderless: "",
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
	},
);

type EmptyProps = React.ComponentProps<"div"> & VariantProps<typeof emptyVariants>;

/**
 * ⚠️ Pas de `role="status"` / `aria-live="polite"` par défaut.
 *
 * Ces défauts existaient et ne pouvaient rien annoncer : un `Empty` est rendu
 * **parce que** la liste est vide, donc il entre dans l'arbre d'accessibilité au
 * même frame que son texte — cas où les lecteurs d'écran restent muets. Le seul
 * effet réel était 22 régions live inertes dans le DOM, et un risque de relecture
 * parasite à chaque re-render du parent.
 *
 * Les deux attributs restent transmissibles par prop pour les rares `Empty`
 * réellement montés en permanence. Pour annoncer une **transition** vers l'état
 * vide, utiliser `announce()` (`shared/utils/announce.ts`) depuis le parent —
 * cf. `wishlist-list-content.tsx`.
 */
function Empty({ className, variant = "default", size = "default", ...props }: EmptyProps) {
	return (
		<div
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
			className={cn("flex max-w-md flex-col items-center gap-3 text-center", className)}
			{...props}
		/>
	);
}

const emptyMediaVariants = cva(
	// `animate-sparkle-pulse-once` et non `-pulse` : un état vide PERSISTE (le panneau du
	// panier vide peut rester ouvert indéfiniment), or l'icône tournait de 15° en boucle
	// pour toujours — mouvement automatique de durée illimitée, WCAG 2.2.2. La variante
	// bornée fait 2 itérations, soit 4 s, sous le seuil de 5 s au-delà duquel un mécanisme
	// de pause serait dû. Les toasts (`toast-icons.tsx`) gardent la variante infinie : ils
	// se démontent, donc leur animation est transitoire par construction.
	"flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 transition-all duration-300 motion-safe:animate-sparkle-pulse-once shadow-[0_0_24px_var(--color-glow-pink)]",
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
	},
);

function EmptyMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
	return (
		<div
			aria-hidden="true"
			data-slot="empty-media"
			data-variant={variant}
			className={cn(emptyMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"h3">) {
	return (
		// eslint-disable-next-line jsx-a11y/heading-has-content -- content passed via children spread
		<h3
			data-slot="empty-title"
			className={cn(
				"font-display xs:text-xl text-foreground text-lg font-normal tracking-tight sm:text-2xl",
				className,
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
				"text-muted-foreground [&>a]:text-primary [&>a]:decoration-primary/30 [&>a:hover]:text-primary/80 max-w-sm text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4 [&>a]:transition-colors",
				className,
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
				className,
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
				"xs:flex-row xs:w-auto mt-2 flex w-full flex-col flex-wrap items-center justify-center gap-3",
				"xs:[&_button]:w-auto xs:[&_a]:w-auto [&_a]:min-h-11 [&_a]:w-full [&_button]:min-h-11 [&_button]:w-full",
				className,
			)}
			{...props}
		/>
	);
}

export { Empty, EmptyActions, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
