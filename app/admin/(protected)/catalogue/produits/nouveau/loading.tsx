import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import {
	FORM_SECTION_ACCENT_CLASS,
	FORM_SECTION_CARD_CLASS,
} from "@/shared/components/forms/form-section-styles";
import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

const CARD_INNER = "px-0 sm:px-0 md:px-6";

function CardSkeleton({
	ariaLabel,
	titleWidth,
	accent,
	children,
}: {
	ariaLabel: string;
	titleWidth: string;
	accent: "rose" | "mint" | "sun";
	children: React.ReactNode;
}) {
	return (
		<div
			role="region"
			aria-label={ariaLabel}
			data-accent={accent}
			className={cn(FORM_SECTION_CARD_CLASS, FORM_SECTION_ACCENT_CLASS)}
		>
			<div className={CARD_INNER}>
				<Skeleton className={`h-5 ${titleWidth}`} />
			</div>
			<div className={`${CARD_INNER} space-y-4`}>{children}</div>
		</div>
	);
}

function FieldSkeleton({
	labelWidth = "w-24",
	hintWidth,
}: {
	labelWidth?: string;
	hintWidth?: string;
}) {
	return (
		<div className="space-y-2">
			<Skeleton className={`h-4 ${labelWidth}`} />
			<Skeleton className="h-10 w-full" />
			{hintWidth ? <Skeleton className={`h-3 ${hintWidth}`} /> : null}
		</div>
	);
}

function FieldWithAddButtonSkeleton({ labelWidth }: { labelWidth: string }) {
	return (
		<div className="space-y-2">
			<Skeleton className={`h-4 ${labelWidth}`} />
			<div className="flex gap-2">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="size-11 shrink-0 sm:size-9" />
			</div>
		</div>
	);
}

/**
 * Squelette du formulaire de création.
 *
 * ⚠️ Il doit refléter la géométrie RÉELLE du formulaire — colonne unique bornée à
 * 46rem, trois sections, règle d'établi en pied. Un squelette resté sur l'ancienne
 * grille à trois colonnes produirait un saut de mise en page à l'hydratation.
 *
 * Le chrome de card vient de la SSOT `FORM_SECTION_CARD_CLASS`, jamais d'une copie
 * locale de la chaîne : c'est exactement cette copie qui aurait désynchronisé le
 * squelette lors du passage de `lg:` à `md:`.
 */
export default function CreateProductLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire" className="space-y-6">
			<span className="sr-only">Chargement du formulaire…</span>

			<PageHeaderSkeleton variant="compact" hasDescription={false} className="hidden md:block" />

			<div className="space-y-6">
				{/* `space-y-10` : la MÊME valeur que le `<fieldset>` du formulaire. Il
				    était resté à `space-y-6`, soit ~48px de décalage cumulé sur trois
				    sections — exactement le saut de mise en page que ce squelette dit
				    vouloir empêcher. */}
				<div className="max-w-[46rem] space-y-10">
					{/* Les photos */}
					<CardSkeleton ariaLabel="Les photos" titleWidth="w-24" accent="sun">
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-3">
								<Skeleton className="h-3 w-64 max-w-[60%]" />
								<Skeleton className="h-6 w-12 rounded-full" />
							</div>

							{/* Info banner empty state */}
							<div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
								<Skeleton className="size-5 shrink-0" />
								<Skeleton className="h-4 w-48" />
							</div>

							{/* Upload trigger button */}
							<Skeleton className="h-11 w-full rounded-md" />
							<Skeleton className="mx-auto h-3 w-56" />
						</div>
					</CardSkeleton>

					{/* Le bijou */}
					<CardSkeleton ariaLabel="Le bijou" titleWidth="w-20" accent="rose">
						<FieldSkeleton labelWidth="w-28" />

						{/* Description (textarea + counter) */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-24 w-full" />
							<Skeleton className="ml-auto h-3 w-24" />
						</div>

						{/* Type (select + plus button) */}
						<FieldWithAddButtonSkeleton labelWidth="w-24" />

						{/* Collections (multi-select + hint) */}
						<FieldSkeleton labelWidth="w-24" hintWidth="w-64" />

						{/* Couleurs, matériaux, taille — la variante initiale */}
						<FieldWithAddButtonSkeleton labelWidth="w-20" />
						<FieldWithAddButtonSkeleton labelWidth="w-24" />
						<FieldSkeleton labelWidth="w-16" />
					</CardSkeleton>

					{/* Le prix et le stock */}
					<CardSkeleton ariaLabel="Le prix et le stock" titleWidth="w-36" accent="mint">
						<FieldSkeleton labelWidth="w-32" hintWidth="w-40" />
						<FieldSkeleton labelWidth="w-40" hintWidth="w-56" />
						<FieldSkeleton labelWidth="w-32" hintWidth="w-52" />
					</CardSkeleton>
				</div>

				{/* Le `className` réplique l'override du call site réel : sans lui, le pied
				    du squelette est en flux au-dessus de `md` alors que le vrai y est
				    collant — donc il saute au moment de l'hydratation. */}
				<AdminFormFooter className="md:bg-background/80 md:sticky md:bottom-0 md:z-10 md:-mx-[var(--admin-main-x,1.5rem)] md:px-[var(--admin-main-x,1.5rem)] md:py-3 md:backdrop-blur-md">
					{/* La règle d'établi : visibilité + récapitulatif + action */}
					<div className="border-border bg-muted/40 flex flex-col gap-3 rounded-xl border px-4 py-3 md:flex-row md:items-center md:gap-6">
						<div className="flex items-center gap-4">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-6 w-24" />
							<Skeleton className="h-6 w-24" />
						</div>
						<Skeleton className="h-4 w-40 md:ml-auto" />
						<Skeleton className="h-11 w-full sm:min-w-56 md:w-auto" />
					</div>
				</AdminFormFooter>
			</div>
		</div>
	);
}
