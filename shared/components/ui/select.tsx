"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/shared/utils/cn";

/**
 * `SelectRoot.Props` est générique sur le type de la valeur et sur le mode
 * multiple. Tous nos selects sont mono-valeur et portent des `string` : on fixe
 * les paramètres ici pour que `onValueChange` reste typé au call site.
 *
 * ⚠️ Base UI type la valeur du callback `string | null` (un select peut être
 * vidé) et lui ajoute un second argument `eventDetails`. Aucun de nos appelants
 * n'a de chemin « vide » ni besoin du détail d'événement : on re-type ici en
 * `(value: string) => void` et on absorbe le `null` en chaîne vide, plutôt que
 * de faire porter la garde par les 10 call sites.
 */
type SelectProps = Omit<SelectPrimitive.Root.Props<string, false>, "onValueChange"> & {
	onValueChange?: (value: string) => void;
};

function Select({ onValueChange, ...props }: SelectProps) {
	return (
		<SelectPrimitive.Root
			data-slot="select"
			onValueChange={onValueChange ? (value) => onValueChange(value ?? "") : undefined}
			{...props}
		/>
	);
}

function SelectValue({ ...props }: SelectPrimitive.Value.Props) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

const selectTriggerVariants = cva(
	"border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-ring aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex w-fit items-center justify-between gap-2 rounded-xl border bg-transparent px-3 py-2 whitespace-nowrap shadow-xs transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			size: {
				default: "min-h-11 text-base md:text-sm",
				sm: "min-h-9 text-sm",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

function SelectTrigger({
	className,
	size,
	children,
	...props
}: SelectPrimitive.Trigger.Props & VariantProps<typeof selectTriggerVariants>) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(selectTriggerVariants({ size }), className)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon
				data-slot="select-icon"
				render={<ChevronDownIcon className="size-4 opacity-70" />}
			/>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	side = "bottom",
	sideOffset = 4,
	align = "start",
	alignOffset = 0,
	...props
}: SelectPrimitive.Popup.Props &
	Pick<SelectPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
	return (
		<SelectPrimitive.Portal>
			{/* `alignItemWithTrigger={false}` reproduit le `position="popper"` de Radix
			    (seul mode utilisé ici) : le popup se place SOUS le trigger au lieu
			    d'aligner l'item sélectionné dessus. */}
			<SelectPrimitive.Positioner
				alignItemWithTrigger={false}
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				className="isolate z-(--z-float)"
			>
				<SelectPrimitive.Popup
					data-slot="select-content"
					className={cn(
						"bg-popover text-popover-foreground relative max-h-(--available-height) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border shadow-lg",
						"motion-safe:data-open:animate-in motion-safe:data-closed:animate-out",
						"motion-safe:data-closed:fade-out-0 motion-safe:data-open:fade-in-0",
						"motion-safe:data-closed:zoom-out-95 motion-safe:data-open:zoom-in-95",
						"motion-safe:data-[side=bottom]:slide-in-from-top-2 motion-safe:data-[side=left]:slide-in-from-right-2",
						"motion-safe:data-[side=right]:slide-in-from-left-2 motion-safe:data-[side=top]:slide-in-from-bottom-2",
						// cf. `ui/popover.tsx` — `animate-out` exige un fill mode.
						"fill-mode-forwards",
						className,
					)}
					{...props}
				>
					<SelectScrollUpButton />
					<SelectPrimitive.List className="w-full min-w-(--anchor-width) scroll-my-1 p-1">
						{children}
					</SelectPrimitive.List>
					<SelectScrollDownButton />
				</SelectPrimitive.Popup>
			</SelectPrimitive.Positioner>
		</SelectPrimitive.Portal>
	);
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				// Comme pour le Menu, l'item actif de Base UI est marqué
				// `data-highlighted` (focus virtuel) — un `focus:` ne s'appliquerait pas.
				"data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-2.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
				className,
			)}
			{...props}
		>
			<span className="absolute right-2 flex size-3.5 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="size-4" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectScrollUpButton({ className, ...props }: SelectPrimitive.ScrollUpArrow.Props) {
	return (
		<SelectPrimitive.ScrollUpArrow
			data-slot="select-scroll-up-button"
			aria-label="Faire défiler vers le haut"
			className={cn("flex cursor-default items-center justify-center py-2", className)}
			{...props}
		>
			<ChevronUpIcon className="size-4" aria-hidden="true" />
		</SelectPrimitive.ScrollUpArrow>
	);
}

function SelectScrollDownButton({ className, ...props }: SelectPrimitive.ScrollDownArrow.Props) {
	return (
		<SelectPrimitive.ScrollDownArrow
			data-slot="select-scroll-down-button"
			aria-label="Faire défiler vers le bas"
			className={cn("flex cursor-default items-center justify-center py-2", className)}
			{...props}
		>
			<ChevronDownIcon className="size-4" aria-hidden="true" />
		</SelectPrimitive.ScrollDownArrow>
	);
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
