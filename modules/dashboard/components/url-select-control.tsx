"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition, Suspense, type ComponentProps, type ReactNode } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

/**
 * Loading cue wired to the `data-pending` attribute: a subtle opacity dim that
 * works independently of motion preferences. Paired with `aria-busy` (AT) and a
 * motion-safe spinner — under `prefers-reduced-motion` the dim alone signals the
 * pending refetch (no spinning animation).
 */
const PENDING_DIM = "transition-opacity data-[pending]:opacity-65";

export interface UrlSelectOption {
	value: string;
	/** Full label — used by the select dropdown and as AT accessible name */
	label: string;
	/** Short label for the segmented mobile control (falls back to `label`) */
	shortLabel?: string;
}

interface UrlSelectControlProps {
	/** Selectable options (drives rendering AND value validation) */
	options: UrlSelectOption[];
	/** Search param name driving server refetch (e.g. "period", "comparison") */
	searchParam: string;
	/** Value applied when the param is absent/invalid — also deleted from URL */
	defaultValue: string;
	/** Accessible name for the trigger / tablist */
	ariaLabel: string;
	/** Visual variant — select dropdown (default) or inline segmented control */
	variant?: "select" | "segmented";
	/** Render full-width trigger (for mobile select variant) */
	fullWidth?: boolean;
	/** Trigger width class for the select variant when not full-width (e.g. "w-44") */
	triggerWidthClassName?: string;
	/** Grid columns class for the segmented variant (e.g. "grid-cols-2") */
	segmentedColsClassName?: string;
	/** Leading icon shown in the select trigger (signals the control's purpose) */
	icon?: ReactNode;
}

/**
 * URL-based selector shared by the dashboard period + comparison controls.
 * Updates a search param, triggering server-side data refetch. Optimistic
 * value + transition spinner + haptic feedback. Uses `router.replace` so
 * toggling does not pollute browser history.
 */
function UrlSelectControlInner({
	options,
	searchParam,
	defaultValue,
	ariaLabel,
	variant = "select",
	fullWidth,
	triggerWidthClassName = "w-44",
	segmentedColsClassName = "grid-cols-2",
	icon,
}: UrlSelectControlProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const raw = searchParams.get(searchParam);
	const currentValue = options.find((o) => o.value === raw)?.value ?? defaultValue;
	const [optimisticValue, setOptimisticValue] = useOptimistic<string>(currentValue);

	function handleChange(value: string) {
		if (value === optimisticValue) return;
		const params = new URLSearchParams(searchParams);

		if (value === defaultValue) {
			params.delete(searchParam);
		} else {
			params.set(searchParam, value);
		}

		triggerHaptic("selection");

		startTransition(() => {
			setOptimisticValue(value);
			const query = params.toString();
			router.replace(query ? `?${query}` : ".", { scroll: false });
		});
	}

	if (variant === "segmented") {
		return (
			<div className="relative w-full">
				<Tabs value={optimisticValue} onValueChange={handleChange} className="w-full">
					<TabsList
						className={cn("grid w-full gap-0.5", segmentedColsClassName, PENDING_DIM)}
						aria-label={ariaLabel}
						aria-busy={isPending || undefined}
						data-pending={isPending || undefined}
					>
						{options.map((option) => (
							<TabsTrigger
								key={option.value}
								value={option.value}
								className="min-h-11 px-1.5 text-xs sm:min-h-9"
								// Only add an aria-label when the visible (short) text differs
								// from the full label, to avoid a redundant double announcement.
								aria-label={option.shortLabel ? option.label : undefined}
							>
								{option.shortLabel ?? option.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				{isPending && (
					<Loader2
						className="text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 animate-spin motion-reduce:hidden"
						aria-hidden="true"
					/>
				)}
			</div>
		);
	}

	return (
		<Select value={optimisticValue} onValueChange={handleChange}>
			<SelectTrigger
				className={cn(fullWidth ? "w-full" : triggerWidthClassName, PENDING_DIM)}
				aria-label={ariaLabel}
				aria-busy={isPending || undefined}
				data-pending={isPending || undefined}
			>
				<span className="flex items-center gap-2">
					{isPending ? (
						<>
							<Loader2
								className="text-muted-foreground size-3.5 shrink-0 animate-spin motion-reduce:hidden"
								aria-hidden="true"
							/>
							{/* Under reduced motion the spinner is hidden — keep the icon
							    so the leading slot stays stable (no layout shift). */}
							<span className="hidden shrink-0 motion-reduce:contents">{icon}</span>
						</>
					) : (
						icon
					)}
					<SelectValue />
				</span>
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function UrlSelectControl(props: ComponentProps<typeof UrlSelectControlInner>) {
	return (
		<Suspense fallback={null}>
			<UrlSelectControlInner {...props} />
		</Suspense>
	);
}
