import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
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
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Commande livrée</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, votre commande {orderNumber} a été livrée le{" "}
					{deliveryDate}.
				</Text>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={orderDetailsUrl} style={EMAIL_STYLES.button.primary}>
					Voir ma commande
				</Button>
			</Section>
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
