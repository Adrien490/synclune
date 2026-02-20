import { Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
import { FlexRow } from "./_components/flex-row";

interface AdminCheckoutFailedEmailProps {
	orderNumber: string;
	customerEmail: string;
	total: number;
	errorMessage: string;
}

export const AdminCheckoutFailedEmail = ({
	orderNumber,
	customerEmail,
	total,
	errorMessage,
}: AdminCheckoutFailedEmailProps) => {
	return (
		<EmailLayout
			preview={`Échec création session Stripe — Commande ${orderNumber}`}
			headerText="Échec checkout Stripe"
			footer={
				<Text style={EMAIL_STYLES.text.tiny}>
					Vérifiez les logs Vercel et le dashboard Stripe pour plus
					d&apos;informations.
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text style={EMAIL_STYLES.text.small}>
					La création de la session Stripe Checkout a échoué. La commande a été
					nettoyée automatiquement.
				</Text>
			</Section>

			{/* Details */}
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
									color: EMAIL_STYLES.heading.h3.color,
								}}
							>
								{orderNumber}
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
									color: EMAIL_STYLES.heading.h3.color,
								}}
							>
								{customerEmail}
							</Text>
						}
					/>
					<FlexRow
						left={<Text style={EMAIL_STYLES.text.small}>Montant</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_STYLES.heading.h3.color,
								}}
							>
								{(total / 100).toFixed(2)} €
							</Text>
						}
					/>
				</div>
			</Section>

			{/* Error details */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Erreur
				</Text>
				<ErrorCodeBlock error={errorMessage} />
			</Section>
		</EmailLayout>
	);
};

AdminCheckoutFailedEmail.PreviewProps = {
	orderNumber: "SYN-20260220-A1B2",
	customerEmail: "client@example.com",
	total: 8900,
	errorMessage:
		"StripeConnectionError: Could not connect to Stripe API after 2 retries",
} as AdminCheckoutFailedEmailProps;

export default AdminCheckoutFailedEmail;
