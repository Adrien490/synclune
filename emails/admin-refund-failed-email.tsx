import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
import { FlexRow } from "./_components/flex-row";

interface AdminRefundFailedEmailProps {
	orderNumber: string;
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
		<EmailLayout
			preview={`ACTION REQUISE : Échec du remboursement - ${orderNumber}`}
			headerText="Échec du remboursement"
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text style={{ ...EMAIL_STYLES.text.small }}>
					Action manuelle requise
				</Text>
			</Section>

			{/* Détails */}
			<Section style={{ marginBottom: "24px" }}>
				<div style={EMAIL_STYLES.section.card}>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Commande</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{orderNumber}
							</Text>
						}
					/>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Montant</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.primary,
								}}
							>
								{formatEuro(amount)}
							</Text>
						}
					/>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Client</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{customerEmail}
							</Text>
						}
					/>
					<FlexRow
						left={<Text style={EMAIL_STYLES.text.small}>Raison</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{reasonLabels[reason]}
							</Text>
						}
					/>
				</div>
			</Section>

			{/* Erreur */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Erreur
				</Text>
				<ErrorCodeBlock error={errorMessage} />
			</Section>

			{/* Stripe IDs */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Identifiants Stripe
				</Text>
				<div style={EMAIL_STYLES.section.card}>
					<Text style={EMAIL_STYLES.text.tiny}>Payment Intent ID</Text>
					<Text
						style={{
							margin: 0,
							marginTop: "4px",
							fontFamily: "monospace",
							fontSize: "12px",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{stripePaymentIntentId}
					</Text>
				</div>
			</Section>

			{/* CTAs */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<div style={{ marginBottom: "12px" }}>
					<Button
						href={stripeDashboardUrl}
						style={{
							...EMAIL_STYLES.button.primary,
							backgroundColor: EMAIL_COLORS.stripe,
						}}
					>
						Ouvrir Stripe
					</Button>
				</div>
				<div>
					<Button href={dashboardUrl} style={EMAIL_STYLES.button.primary}>
						Voir la commande
					</Button>
				</div>
			</Section>
		</EmailLayout>
	);
};

AdminRefundFailedEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
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
