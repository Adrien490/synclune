import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Clock, Info, MapPin, UserPlus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { OrderTrackingSkeleton } from "@/app/suivi-commande/_components/order-tracking-skeleton";
import { getOrderForTracking } from "@/modules/orders/data/get-order-for-tracking";
import { OrderItemsList } from "@/modules/orders/components/customer/order-items-list";
import { OrderStatusTimeline } from "@/modules/orders/components/customer/order-status-timeline";
import { OrderSummaryCard } from "@/modules/orders/components/customer/order-summary-card";
import { OrderTracking } from "@/modules/orders/components/customer/order-tracking";
import { OrderReturnGuidance } from "@/modules/orders/components/customer/order-return-guidance";
import { orderNumberParamSchema } from "@/modules/orders/schemas/order-route-params.schema";
import { formatCountryName } from "@/shared/constants/countries";
import { BRAND } from "@/shared/constants/brand";
import { ROUTES } from "@/shared/constants/urls";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { ORDER_LIMITS } from "@/shared/lib/rate-limit-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Suivi de ma commande | Synclune",
	description: "Suis l'avancement de ta commande Synclune.",
	robots: { index: false, follow: false },
};

/**
 * Suivi de commande accessible **sans compte** (AUDIT-BIZ-001).
 *
 * Le checkout invité est un chemin de premier ordre (`confirmCheckout` n'exige
 * aucune session), mais `/commandes` est derrière `protectedRoutes` : sans cette
 * page, le CTA « Suivre ma commande » de l'email de confirmation envoyait un
 * invité sur un mur de connexion pour un compte qu'il n'a pas.
 *
 * Authentification : token HMAC sans état dérivé de `(orderId, orderNumber)`
 * avec un namespace propre au suivi — un lien de suivi ne confère PAS l'accès au
 * PDF de facture (`invoice-token.ts`), dont la surface PII est plus large.
 *
 * Fail-closed indistinct : commande inexistante, supprimée ou token invalide →
 * le même `notFound()`, pour ne pas offrir d'oracle d'existence de commande.
 */
const searchParamsSchema = z.object({
	commande: orderNumberParamSchema,
	token: z.string().regex(/^[0-9a-f]{32}$/, "Token invalide"),
});

interface OrderTrackingPageProps {
	searchParams: Promise<{ commande?: string; token?: string }>;
}

export default function OrderTrackingPage({ searchParams }: OrderTrackingPageProps) {
	return (
		<Suspense fallback={<OrderTrackingSkeleton />}>
			<OrderTrackingPageContent searchParams={searchParams} />
		</Suspense>
	);
}

async function OrderTrackingPageContent({ searchParams }: OrderTrackingPageProps) {
	const parsed = searchParamsSchema.safeParse(await searchParams);
	if (!parsed.success) {
		notFound();
	}

	// Rate limit par IP — la page n'a pas de session sur laquelle s'appuyer.
	const ipAddress = await getClientIp(await headers());
	const rateCheck = await checkRateLimit(
		`order-tracking:${ipAddress ?? "unknown"}`,
		ORDER_LIMITS.TRACKING_VIEW,
		ipAddress,
	);
	if (!rateCheck.success) {
		return (
			<TrackingShell>
				<Alert variant="destructive" role="alert">
					<Info className="size-4" />
					<AlertTitle>Trop de requêtes</AlertTitle>
					<AlertDescription>
						Merci de patienter quelques minutes avant de recharger cette page.
					</AlertDescription>
				</Alert>
			</TrackingShell>
		);
	}

	const order = await getOrderForTracking(parsed.data.commande, parsed.data.token);
	if (!order) {
		notFound();
	}

	// Une commande rattachée à un compte reste consultable via ce lien (l'invité a
	// pu créer son compte ensuite — cf. `post-login-merge`), mais on l'invite à
	// passer par son espace client, plus complet (facture, retour, réachat).
	const hasAccount = order.userId !== null;

	return (
		<TrackingShell>
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="font-display text-xl font-normal tracking-tight sm:text-2xl">
						Suivi de ma commande
					</h1>
					<p className="text-muted-foreground text-sm">
						Commande <span className="text-foreground font-medium">#{order.orderNumber}</span>
					</p>
				</div>

				{order.paymentStatus === "PENDING" && (
					<Alert>
						<Clock />
						<AlertTitle>Paiement en cours de vérification</AlertTitle>
						<AlertDescription>
							Ton paiement est en cours de vérification. Tu recevras un email de confirmation dès
							qu&apos;il sera validé.
						</AlertDescription>
					</Alert>
				)}

				<Card className="border-primary/10 rounded-2xl shadow-sm">
					<CardContent className="space-y-6 p-4 sm:p-6">
						<OrderStatusTimeline order={order} />
						<OrderTracking order={order} />
						<OrderReturnGuidance order={order} />
					</CardContent>
				</Card>

				<Card className="border-primary/10 rounded-2xl shadow-sm">
					<CardContent className="space-y-6 p-4 sm:p-6">
						<OrderItemsList items={order.items} />
						<OrderSummaryCard order={order} />
						<ShippingAddress order={order} />
					</CardContent>
				</Card>

				{!hasAccount && (
					<Card className="rounded-xl border-dashed">
						<CardContent className="flex items-start gap-4 p-4">
							<div
								aria-hidden="true"
								className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full"
							>
								<UserPlus className="text-primary size-5" />
							</div>
							<div className="space-y-2">
								<h2 className="font-semibold">Crée ton compte pour tout retrouver</h2>
								<p className="text-muted-foreground text-sm">
									En créant un compte avec l&apos;adresse email de cette commande, elle sera
									automatiquement rattachée — avec ta facture, tes adresses et tes prochains achats.
								</p>
								<Button asChild variant="outline" size="sm">
									<Link href={ROUTES.AUTH.SIGN_UP}>
										<UserPlus className="size-4" />
										Créer mon compte
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{hasAccount && (
					<div className="text-center">
						<Button asChild variant="outline">
							<Link href={ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber)}>
								Voir dans mon espace client
							</Link>
						</Button>
					</div>
				)}

				<div className="space-y-2 text-center">
					<p className="text-muted-foreground text-sm">Une question sur ta commande ?</p>
					<Button asChild variant="link">
						<Link href={`mailto:${BRAND.contact.email}`}>Écris-moi</Link>
					</Button>
				</div>
			</div>
		</TrackingShell>
	);
}

function TrackingShell({ children }: { children: React.ReactNode }) {
	return (
		<section className="py-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:py-10">
			<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">{children}</div>
		</section>
	);
}

/**
 * Adresse de livraison rendue inline (pas `OrderAddressesCard`) : ce composant
 * exige `shippingPhone`, que `GET_ORDER_TRACKING_SELECT` exclut délibérément —
 * minimisation PII sur une page authentifiée par lien.
 */
function ShippingAddress({
	order,
}: {
	order: {
		shippingFirstName: string;
		shippingLastName: string;
		shippingAddress1: string;
		shippingAddress2: string | null;
		shippingPostalCode: string;
		shippingCity: string;
		shippingCountry: string;
	};
}) {
	return (
		<section className="space-y-4">
			<h2 className="flex items-center gap-2 text-base font-semibold">
				<MapPin className="text-muted-foreground size-4" aria-hidden="true" />
				Adresse de livraison
			</h2>
			<div className="border-border/60 space-y-0.5 border-t pt-4 text-sm">
				<p className="font-medium">
					{order.shippingFirstName} {order.shippingLastName}
				</p>
				<p className="text-muted-foreground">{order.shippingAddress1}</p>
				{order.shippingAddress2 && (
					<p className="text-muted-foreground">{order.shippingAddress2}</p>
				)}
				<p className="text-muted-foreground">
					{order.shippingPostalCode} {order.shippingCity}
				</p>
				<p className="text-muted-foreground">{formatCountryName(order.shippingCountry)}</p>
			</div>
		</section>
	);
}
