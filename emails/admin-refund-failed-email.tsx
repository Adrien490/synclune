import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
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
			preview={`Échec remboursement — ${orderNumber}`}
			headerText="Échec du remboursement"
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Action manuelle requise
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Commande
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
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
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Montant
						</Text>
					}
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
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Client
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
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
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Raison
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
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
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Erreur
				</EmailHeading>
				<ErrorCodeBlock error={errorMessage} />
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Identifiants Stripe
				</EmailHeading>
				<EmailCard>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
						Payment Intent ID
					</Text>
					<Text
						className={EMAIL_CLASSES.text.body}
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
				</EmailCard>
			</Section>

			<Section style={{ marginBottom: "12px", textAlign: "center" }}>
				<Button
					href={stripeDashboardUrl}
					className={EMAIL_CLASSES.button.primary}
					style={{
						...EMAIL_STYLES.button.primary,
						backgroundColor: EMAIL_COLORS.stripe,
					}}
				>
					Ouvrir Stripe
				</Button>
			</Section>
			<EmailCTA href={dashboardUrl}>Voir la commande</EmailCTA>
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
	stripeDashboardUrl: "https://dashboard.stripe.com/payments/pi_1234567890abcdefghij",
} as AdminRefundFailedEmailProps;

export default AdminRefundFailedEmail;
