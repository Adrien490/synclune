import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
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
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Paiement échoué</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, le paiement de votre commande {orderNumber} a échoué. Les articles
					ont été remis en stock.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Cela peut être dû à un solde insuffisant, un rejet bancaire ou un problème technique.
				</Text>
			</EmailCard>

			<EmailCTA href={retryUrl}>Retourner à la boutique</EmailCTA>
		</EmailLayout>
	);
};

PaymentFailedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	retryUrl: "https://synclune.fr/creations",
} as PaymentFailedEmailProps;

export default PaymentFailedEmail;
