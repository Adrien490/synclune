import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface DeliveryConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	deliveryDate: string;
	orderDetailsUrl: string;
}

export const DeliveryConfirmationEmail = ({
	orderNumber,
	customerName,
	deliveryDate,
	orderDetailsUrl,
}: DeliveryConfirmationEmailProps) => {
	return (
		<EmailLayout preview={`Commande ${orderNumber} livrée`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Commande livrée</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre commande {orderNumber} a été livrée le {deliveryDate}.
				</Text>
			</Section>

			<EmailCTA href={orderDetailsUrl}>Voir ma commande</EmailCTA>
		</EmailLayout>
	);
};

DeliveryConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
	deliveryDate: "27 novembre 2025",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-1730000000-ABCD",
} as DeliveryConfirmationEmailProps;

export default DeliveryConfirmationEmail;
