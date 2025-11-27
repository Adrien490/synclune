"use client";

import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/utils/cn";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { DateRange } from "react-day-picker";

export interface DateRangeFilterProps {
	afterKey: string;
	beforeKey: string;
	label: string;
	placeholder?: string;
	className?: string;
}

export function DateRangeFilter({
	afterKey,
	beforeKey,
	label,
	placeholder = "Sélectionner une période...",
	className,
}: DateRangeFilterProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Préfixes pour les filtres dans l'URL
	const afterParamKey = `filter_${afterKey}`;
	const beforeParamKey = `filter_${beforeKey}`;

	// Récupérer les valeurs actuelles du filtre
	const afterValue = searchParams.get(afterParamKey);
	const beforeValue = searchParams.get(beforeParamKey);

	// Construire le DateRange actuel
	const currentRange: DateRange | undefined =
		afterValue || beforeValue
			? {
					from: afterValue ? new Date(afterValue) : undefined,
					to: beforeValue ? new Date(beforeValue) : undefined,
				}
			: undefined;

	// État optimiste pour une meilleure UX
	const [dateRange, setOptimisticRange] =
		useOptimistic<DateRange | undefined>(currentRange);

	// Mise à jour de l'URL avec les nouveaux paramètres
	const updateUrlWithParams = (
		params: URLSearchParams,
		newRange: DateRange | undefined
	) => {
		startTransition(() => {
			setOptimisticRange(newRange);
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	// Préservation des paramètres existants
	const preserveExistingParams = () => {
		const params = new URLSearchParams(searchParams);
		return params;
	};

	// Définir une nouvelle plage de dates
	const setDateRange = (range: DateRange | undefined) => {
		const params = preserveExistingParams();

		// Supprimer les paramètres existants
		params.delete(afterParamKey);
		params.delete(beforeParamKey);

		// Ajouter les nouvelles valeurs si elles existent
		if (range?.from) {
			params.set(afterParamKey, range.from.toISOString());
		}
		if (range?.to) {
			params.set(beforeParamKey, range.to.toISOString());
		}

		// IMPORTANT: Réinitialiser la pagination à la page 1 quand un filtre change
		params.set("page", "1");

		updateUrlWithParams(params, range);
	};

	// Effacer le filtre de date range
	const clearDateRange = () => {
		const params = preserveExistingParams();
		params.delete(afterParamKey);
		params.delete(beforeParamKey);

		// Réinitialiser également la pagination à la page 1
		params.set("page", "1");

		updateUrlWithParams(params, undefined);
	};

	// Gérer le changement de plage de dates
	const handleSelect = (range: DateRange | undefined) => {
		setDateRange(range);
	};

	// Gérer la réinitialisation
	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		clearDateRange();
	};

	// Formater l'affichage de la plage de dates
	const formatDateRange = (range: DateRange | undefined) => {
		if (!range) return placeholder;

		if (range.from) {
			if (range.to) {
				return `${format(range.from, "dd MMM yyyy", { locale: fr })} - ${format(range.to, "dd MMM yyyy", { locale: fr })}`;
			}
			return format(range.from, "dd MMM yyyy", { locale: fr });
		}

		return placeholder;
	};

	return (
		<div
			data-pending={isPending ? "" : undefined}
			className={cn("min-w-[280px] relative", className)}
		>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						disabled={isPending}
						className={cn(
							"w-full justify-start text-left font-normal",
							!dateRange && "text-muted-foreground"
						)}
					>
						<span className="text-muted-foreground text-xs mr-2">{label}</span>
						<CalendarIcon className="mr-2 h-4 w-4" />
						<span className="flex-1">{formatDateRange(dateRange)}</span>
						{dateRange && (
							<span
								className="h-5 w-5 p-0 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-accent/50 ml-2"
								onClick={handleClear}
							>
								<X className="h-3 w-3" />
							</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="range"
						selected={dateRange}
						onSelect={handleSelect}
						numberOfMonths={2}
						locale={fr}
						disabled={(date) => date > new Date()}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
