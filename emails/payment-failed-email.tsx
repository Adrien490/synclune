import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface PaymentFailedEmailProps {
	orderNumber: string;
	customerName: string;
	retryUrl: string;
}

export const PaymentFailedEmail = ({
	orderNumber,
	customerName,
	retryUrl,
}: PaymentFailedEmailProps) => {
	return (
		<EmailLayout preview={`Échec du paiement - ${orderNumber}`}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Paiement échoué</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, le paiement de ta commande {orderNumber} a
					échoué. Les articles ont été remis en stock.
				</Text>
			</Section>

			{/* Info */}
			<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.text.small}>
					Cela peut être dû à un solde insuffisant, un rejet bancaire ou un
					problème technique.
				</Text>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={retryUrl} style={EMAIL_STYLES.button.primary}>
					Retourner à la boutique
				</Button>
			</Section>
		</EmailLayout>
	);
};

PaymentFailedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	retryUrl: "https://synclune.fr/creations",
} as PaymentFailedEmailProps;

export default PaymentFailedEmail;
