import { formatEuro } from "@/shared/utils/format-euro";
import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { emailTailwindConfig } from "./email-tailwind-config";

interface AdminRefundFailedEmailProps {
	orderNumber: string;
	orderId: string;
	customerEmail: string;
	amount: number;
	reason: "payment_failed" | "payment_canceled" | "other";
	errorMessage: string;
	stripePaymentIntentId: string;
	dashboardUrl: string;
	stripeDashboardUrl: string;
}

export const AdminRefundFailedEmail = ({
	orderNumber,
	orderId,
	customerEmail,
	amount,
	reason,
	errorMessage,
	stripePaymentIntentId,
	dashboardUrl,
	stripeDashboardUrl,
}: AdminRefundFailedEmailProps) => {
	const reasonLabels = {
		payment_failed: "Échec du paiement",
		payment_canceled: "Paiement annulé",
		other: "Autre raison",
	};

	return (
		<Html>
			<Head />
			<Preview>ACTION REQUISE : Échec du remboursement - {orderNumber}</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-8 max-w-[600px] rounded-lg border-2 border-destructive bg-card px-8 py-10">
						{/* Header Alerte */}
						<Section className="mb-8 text-center">
							<Text className="m-0 text-2xl font-bold text-destructive">
								ACTION REQUISE
							</Text>
							<Text className="m-0 mt-2 text-sm font-semibold text-foreground">
								Échec du remboursement automatique
							</Text>
						</Section>

						{/* Message principal */}
						<Section className="mb-8 rounded-md border-2 border-destructive/20 bg-destructive/10 p-4">
							<Text className="m-0 text-base font-bold text-destructive">
								Remboursement manuel requis
							</Text>
							<Text className="m-0 mt-2 text-sm text-foreground">
								Le système a tenté de rembourser automatiquement cette commande
								suite à un <strong>{reasonLabels[reason]}</strong>, mais le
								remboursement a échoué.
							</Text>
							<Text className="m-0 mt-2 text-sm font-semibold text-destructive">
								Un traitement manuel via Stripe est nécessaire.
							</Text>
						</Section>

						{/* Détails */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Détails de la commande
							</Text>
							<div className="rounded-md bg-muted p-4">
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Numéro de commande
									</Text>
									<Text className="m-0 font-mono text-sm font-bold text-foreground">
										{orderNumber}
									</Text>
								</div>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Montant à rembourser
									</Text>
									<Text className="m-0 font-mono text-sm font-bold text-destructive">
										{formatEuro(amount)}
									</Text>
								</div>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Client
									</Text>
									<Text className="m-0 text-sm text-foreground">
										{customerEmail}
									</Text>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Raison
									</Text>
									<Text className="m-0 text-sm text-foreground">
										{reasonLabels[reason]}
									</Text>
								</div>
							</div>
						</Section>

						{/* Erreur */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Message d'erreur
							</Text>
							<div
								className="rounded-md bg-foreground p-3 font-mono text-xs"
								style={{ color: "#ff6b6b" }}
							>
								<code>{errorMessage}</code>
							</div>
						</Section>

						{/* Stripe IDs */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Identifiants Stripe
							</Text>
							<div className="rounded-md bg-muted p-4">
								<Text className="m-0 text-xs font-medium text-muted-foreground">
									Payment Intent ID
								</Text>
								<Text className="m-0 mt-1 font-mono text-sm text-foreground">
									{stripePaymentIntentId}
								</Text>
								<Text className="m-0 mt-3 text-xs font-medium text-muted-foreground">
									Order ID (interne)
								</Text>
								<Text className="m-0 mt-1 font-mono text-sm text-foreground">
									{orderId}
								</Text>
							</div>
						</Section>

						{/* Instructions */}
						<Section className="mb-8 rounded-md border border-border bg-muted p-4">
							<Text className="m-0 text-sm font-bold text-foreground">
								Marche à suivre
							</Text>
							<ol
								style={{
									margin: "12px 0 0 0",
									padding: "0 0 0 20px",
									color: "#212121",
								}}
							>
								<li style={{ marginBottom: "8px", fontSize: "14px" }}>
									Ouvrir le Dashboard Stripe
								</li>
								<li style={{ marginBottom: "8px", fontSize: "14px" }}>
									Rechercher le Payment Intent : {stripePaymentIntentId}
								</li>
								<li style={{ marginBottom: "8px", fontSize: "14px" }}>
									Créer un remboursement manuel pour {formatEuro(amount)}
								</li>
								<li style={{ marginBottom: "8px", fontSize: "14px" }}>
									Vérifier que le stock a été restauré
								</li>
								<li style={{ fontSize: "14px" }}>
									(Optionnel) Contacter le client
								</li>
							</ol>
						</Section>

						{/* Actions */}
						<Section className="mb-8 text-center">
							<div style={{ marginBottom: "12px" }}>
								<Button
									href={stripeDashboardUrl}
									className="inline-block rounded-md bg-[#635bff] px-8 py-4 text-base font-semibold text-white no-underline"
								>
									Ouvrir Dashboard Stripe
								</Button>
							</div>
							<div>
								<Button
									href={dashboardUrl}
									style={{ backgroundColor: "#D4A574" }} className="inline-block rounded-md px-7 py-3 text-sm font-semibold text-white no-underline"
								>
									Voir la commande
								</Button>
							</div>
						</Section>

						{/* Avertissement */}
						<Section className="mb-6 rounded-md border border-destructive/20 bg-destructive/5 p-4">
							<Text className="m-0 text-sm font-bold text-destructive">
								Important
							</Text>
							<Text className="m-0 mt-2 text-xs text-muted-foreground">
								Le stock a été restauré automatiquement. Traiter ce
								remboursement rapidement pour éviter tout problème avec le client
								et la banque.
							</Text>
						</Section>

						{/* Footer */}
						<Section className="border-t pt-6" style={{ borderColor: "#E8E8E8" }}>
							<Text className="m-0 text-center text-xs text-muted-foreground">
								Email d'alerte - Traitement manuel requis
								<br />
								Synclune Dashboard
							</Text>
							<Text className="m-0 mt-2 text-center text-xs text-muted-foreground">
								{new Date().toLocaleString("fr-FR", {
									dateStyle: "full",
									timeStyle: "short",
								})}
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

AdminRefundFailedEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	orderId: "clxxx12345",
	customerEmail: "marie.dupont@example.com",
	amount: 18390,
	reason: "payment_failed",
	errorMessage:
		"Error: This PaymentIntent cannot be refunded because it has a status of requires_payment_method.",
	stripePaymentIntentId: "pi_1234567890abcdefghij",
	dashboardUrl: "https://synclune.fr/dashboard/orders/clxxx12345",
	stripeDashboardUrl:
		"https://dashboard.stripe.com/payments/pi_1234567890abcdefghij",
} as AdminRefundFailedEmailProps;

export default AdminRefundFailedEmail;
