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

interface AdminDisputeAlertEmailProps {
	orderNumber: string;
	orderId: string;
	customerEmail: string;
	customerName: string;
	disputeAmount: number;
	disputeReason: string;
	evidenceDueDate: string;
	stripeDisputeId: string;
	stripePaymentIntentId: string;
	dashboardUrl: string;
	stripeDashboardUrl: string;
}

const disputeReasonLabels: Record<string, string> = {
	duplicate: "Paiement en double",
	fraudulent: "Fraude suspectée",
	subscription_canceled: "Abonnement annulé",
	product_unacceptable: "Produit non conforme",
	product_not_received: "Produit non reçu",
	unrecognized: "Transaction non reconnue",
	credit_not_processed: "Remboursement non effectué",
	general: "Contestation générale",
};

export const AdminDisputeAlertEmail = ({
	orderNumber,
	orderId,
	customerEmail,
	customerName,
	disputeAmount,
	disputeReason,
	evidenceDueDate,
	stripeDisputeId,
	stripePaymentIntentId,
	dashboardUrl,
	stripeDashboardUrl,
}: AdminDisputeAlertEmailProps) => {
	const reasonLabel = disputeReasonLabels[disputeReason] || disputeReason;

	return (
		<Html>
			<Head />
			<Preview>
				URGENT : Litige Stripe - {orderNumber} - Délai : {evidenceDueDate}
			</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-8 max-w-[600px] rounded-lg border-2 border-destructive bg-card px-8 py-10">
						{/* Header Alerte */}
						<Section className="mb-8 text-center">
							<Text className="m-0 text-2xl font-bold text-destructive">
								LITIGE STRIPE
							</Text>
							<Text className="m-0 mt-2 text-sm font-semibold text-foreground">
								Action requise avant le {evidenceDueDate}
							</Text>
						</Section>

						{/* Message d'urgence */}
						<Section className="mb-8 rounded-md border-2 border-destructive/20 bg-destructive/10 p-4">
							<Text className="m-0 text-base font-bold text-destructive">
								Contestation de paiement reçue
							</Text>
							<Text className="m-0 mt-2 text-sm text-foreground">
								Un client a contesté un paiement auprès de sa banque.
								Vous devez soumettre des preuves <strong>avant le {evidenceDueDate}</strong> pour
								contester ce litige. Sans réponse, le litige sera automatiquement perdu.
							</Text>
							<Text className="m-0 mt-2 text-sm font-semibold text-destructive">
								Pénalité en cas de perte : {formatEuro(disputeAmount)} + 15€ de frais
							</Text>
						</Section>

						{/* Détails du litige */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Détails du litige
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
										Commande
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
										Montant contesté
									</Text>
									<Text className="m-0 font-mono text-sm font-bold text-destructive">
										{formatEuro(disputeAmount)}
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
										{customerName} ({customerEmail})
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
										Raison
									</Text>
									<Text className="m-0 text-sm text-foreground">
										{reasonLabel}
									</Text>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Date limite
									</Text>
									<Text className="m-0 text-sm font-bold text-destructive">
										{evidenceDueDate}
									</Text>
								</div>
							</div>
						</Section>

						{/* Stripe IDs */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Identifiants Stripe
							</Text>
							<div className="rounded-md bg-muted p-4">
								<Text className="m-0 text-xs font-medium text-muted-foreground">
									Dispute ID
								</Text>
								<Text className="m-0 mt-1 font-mono text-sm text-foreground">
									{stripeDisputeId}
								</Text>
								<Text className="m-0 mt-3 text-xs font-medium text-muted-foreground">
									Payment Intent ID
								</Text>
								<Text className="m-0 mt-1 font-mono text-sm text-foreground">
									{stripePaymentIntentId}
								</Text>
							</div>
						</Section>

						{/* Instructions */}
						<Section className="mb-8 rounded-md border border-border bg-muted p-4">
							<Text className="m-0 text-sm font-bold text-foreground">
								Preuves à fournir
							</Text>
							<ol
								style={{
									margin: "12px 0 0 0",
									padding: "0 0 0 20px",
									color: "#212121",
								}}
							>
								<li style={{ marginBottom: "8px", fontSize: "14px" }}>
									<strong>Preuve de livraison</strong> : numéro de suivi, signature
								</li>
								<li style={{ marginBottom: "8px", fontSize: "14px" }}>
									<strong>Confirmation de commande</strong> : email envoyé au client
								</li>
								<li style={{ marginBottom: "8px", fontSize: "14px" }}>
									<strong>Description du produit</strong> : photos, facture
								</li>
								<li style={{ marginBottom: "8px", fontSize: "14px" }}>
									<strong>CGV acceptées</strong> : politique de retour
								</li>
								<li style={{ fontSize: "14px" }}>
									<strong>Correspondances</strong> : emails avec le client
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
									Répondre au litige sur Stripe
								</Button>
							</div>
							<div>
								<Button
									href={dashboardUrl}
									style={{ backgroundColor: "#D4A574" }}
									className="inline-block rounded-md px-7 py-3 text-sm font-semibold text-white no-underline"
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
								Sans réponse avant le {evidenceDueDate}, le litige sera automatiquement
								perdu et le montant de {formatEuro(disputeAmount)} sera débité de votre compte Stripe,
								plus 15€ de frais de litige. Les litiges perdus affectent votre taux de
								contestation et peuvent entraîner des restrictions sur votre compte.
							</Text>
						</Section>

						{/* Footer */}
						<Section className="border-t pt-6" style={{ borderColor: "#E8E8E8" }}>
							<Text className="m-0 text-center text-xs text-muted-foreground">
								Alerte automatique - Litige Stripe
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

AdminDisputeAlertEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	orderId: "clxxx12345",
	customerEmail: "marie.dupont@example.com",
	customerName: "Marie Dupont",
	disputeAmount: 8990,
	disputeReason: "product_not_received",
	evidenceDueDate: "15 janvier 2025",
	stripeDisputeId: "dp_1234567890abcdefghij",
	stripePaymentIntentId: "pi_1234567890abcdefghij",
	dashboardUrl: "https://synclune.fr/admin/ventes/commandes/clxxx12345",
	stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_1234567890abcdefghij",
} as AdminDisputeAlertEmailProps;

export default AdminDisputeAlertEmail;
