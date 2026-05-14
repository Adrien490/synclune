import Link from "next/link";
import type { ReactNode } from "react";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { formatShippingPrice } from "@/modules/orders/services/shipping.service";
import { CBIcon, MastercardIcon, VisaIcon } from "@/shared/components/icons/payment-icons";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";
import { ROUTES } from "@/shared/constants/urls";

type Item = {
	title: string;
	description: ReactNode;
	href?: string;
};

const ITEMS: readonly Item[] = [
	{
		title: "Faits main en France",
		description: "Atelier de Léane à Nantes",
		href: ROUTES.SHOP.ABOUT,
	},
	{
		title: `Livraison France ${formatShippingPrice(SHIPPING_RATES.FR.amount)}`,
		description: `UE ${formatShippingPrice(SHIPPING_RATES.EU.amount)} · ${SHIPPING_RATES.FR.estimatedDays}`,
	},
	{
		title: "Retours sous 14 jours",
		description: "Échange ou remboursement",
	},
	{
		title: "Paiement sécurisé",
		description: (
			<span
				className="text-muted-foreground mt-1 flex items-center gap-1.5"
				aria-label="Moyens de paiement acceptés"
			>
				<VisaIcon className="h-4 w-auto" />
				<MastercardIcon className="h-4 w-auto" />
				<CBIcon className="h-4 w-auto" />
			</span>
		),
	},
] as const;

function ItemBody({ title, description }: Pick<Item, "title" | "description">) {
	return (
		<div className="min-w-0">
			<p className="text-foreground text-sm leading-tight font-medium">{title}</p>
			{typeof description === "string" ? (
				<p className="text-muted-foreground text-xs leading-tight">{description}</p>
			) : (
				description
			)}
		</div>
	);
}

export function HeroReassuranceBanner() {
	return (
		<section
			aria-labelledby="reassurance-heading"
			className="bg-muted/15 border-border/40 hidden border-y md:block"
			style={{ viewTransitionName: "reassurance-banner" }}
		>
			<h2 id="reassurance-heading" className="sr-only">
				Nos engagements
			</h2>
			<div className={CONTAINER_CLASS}>
				{/* Safari + VoiceOver perdent le rôle implicite quand list-style:none — fix volontaire */}
				{/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
				<ul role="list" className="grid grid-cols-2 gap-x-3 gap-y-4 py-5 sm:py-6 md:grid-cols-4">
					{ITEMS.map(({ title, description, href }) => (
						<li key={title} className="text-left">
							{href ? (
								<Link
									href={href}
									className="hover:bg-muted/30 focus-visible:ring-ring -mx-2 -my-1 block rounded-md px-2 py-1 outline-none focus-visible:ring-2 motion-safe:transition-colors"
								>
									<ItemBody title={title} description={description} />
								</Link>
							) : (
								<ItemBody title={title} description={description} />
							)}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
