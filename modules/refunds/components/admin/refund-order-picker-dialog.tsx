"use client";

import { ChevronRight, Loader2, SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { SearchInput } from "@/shared/components/search-input";
import { Badge } from "@/shared/components/ui/badge";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	searchRefundableOrders,
	type RefundableOrderOption,
} from "../../actions/search-refundable-orders";

/** Identifiant du dialog sélecteur de commande à rembourser (dialog store). */
export const REFUND_ORDER_PICKER_DIALOG_ID = "refund-order-picker";

/**
 * Dialog « Créer un remboursement » : un remboursement étant toujours rattaché
 * à une commande payée (cf. invariants e-invoicing), on fait choisir la commande
 * via une recherche live, puis on route vers `/nouveau?orderId=`. Évite la
 * redirection sèche vers la liste des commandes (peu intuitive) quand l'admin
 * part de la section Remboursements.
 *
 * Monté une seule fois par page (cf. `RefundsAdminDialogs`). Les déclencheurs
 * (`CreateRefundButton` desktop + item du `StickyActionBar` mobile) ouvrent le
 * dialog via le store partagé `useDialog`.
 */
export function RefundOrderPickerDialog() {
	const { isOpen, close } = useDialog(REFUND_ORDER_PICKER_DIALOG_ID);

	const handleOpenChange = (next: boolean) => {
		if (!next) close();
	};

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Créer un remboursement</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Choisissez la commande payée à rembourser.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{/* Contenu monté uniquement quand le dialog est ouvert : chaque ouverture
				    repart d'un état neuf (pas de reset manuel), et la recherche initiale
				    ne se déclenche qu'à l'affichage. */}
				{isOpen ? <RefundOrderPickerContent onSelect={close} /> : null}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

function RefundOrderPickerContent({ onSelect }: { onSelect: () => void }) {
	const router = useRouter();

	const [results, setResults] = useState<RefundableOrderOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoaded, setHasLoaded] = useState(false);

	// Garde anti-race : seule la dernière requête lancée met à jour l'état.
	const requestSeq = useRef(0);

	// Recherche initiale (commandes récentes remboursables) au montage.
	// setState uniquement dans le `.then` (asynchrone) — pas de cascade de rendu.
	useEffect(() => {
		const seq = ++requestSeq.current;
		let active = true;
		void searchRefundableOrders("").then((orders) => {
			if (!active || seq !== requestSeq.current) return;
			setResults(orders);
			setHasLoaded(true);
			setIsLoading(false);
		});
		return () => {
			active = false;
		};
	}, []);

	// Recherche live (event handler SearchInput) — setState autorisé hors effet.
	const runSearch = (query: string) => {
		const seq = ++requestSeq.current;
		setIsLoading(true);
		void searchRefundableOrders(query)
			.then((orders) => {
				if (seq !== requestSeq.current) return;
				setResults(orders);
				setHasLoaded(true);
			})
			.finally(() => {
				if (seq === requestSeq.current) setIsLoading(false);
			});
	};

	const selectOrder = (orderId: string) => {
		onSelect();
		router.push(`/admin/ventes/remboursements/nouveau?orderId=${orderId}`);
	};

	return (
		<>
			<SearchInput
				size="sm"
				paramName="refund_order_q"
				placeholder="Numéro de commande, nom ou email client…"
				aria-label="Rechercher une commande à rembourser"
				className="w-full"
				preventMobileBlur
				onLiveSearch={runSearch}
			/>

			<div
				className="min-h-40"
				role="listbox"
				aria-label="Commandes remboursables"
				aria-busy={isLoading || undefined}
			>
				{isLoading && results.length === 0 ? (
					<div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
						<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						Recherche…
					</div>
				) : results.length === 0 ? (
					<div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-10 text-center text-sm">
						<SearchX className="size-6" aria-hidden="true" />
						<p>
							{hasLoaded
								? "Aucune commande payée correspondante."
								: "Aucune commande remboursable."}
						</p>
						<p className="text-xs">
							Seules les commandes payées (en cours, expédiées ou livrées) sont remboursables.
						</p>
					</div>
				) : (
					<ul className="divide-y">
						{results.map((order) => (
							<li key={order.id}>
								<button
									type="button"
									role="option"
									aria-selected={false}
									onClick={() => selectOrder(order.id)}
									className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
								>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-medium">{order.orderNumber}</span>
											<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
												{ORDER_STATUS_LABELS[order.status]}
											</Badge>
										</div>
										<p className="text-muted-foreground mt-0.5 truncate text-xs">
											{order.customerName ?? order.customerEmail ?? "Client inconnu"}
										</p>
									</div>
									<span className="text-sm font-medium">{formatEuro(order.total)}</span>
									<ChevronRight
										className="text-muted-foreground size-4 shrink-0"
										aria-hidden="true"
									/>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</>
	);
}
