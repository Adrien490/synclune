import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { TrackingInfo } from "./_components/tracking-info";

interface ShippingConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	carrierLabel: string;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
	};
}

export const ShippingConfirmationEmail = ({
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	shippingAddress,
}: ShippingConfirmationEmailProps) => {
	return (
		<EmailLayout preview={`Commande ${orderNumber} expédiée`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Commande expédiée</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre commande {orderNumber} est en route.
				</Text>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<TrackingInfo carrierLabel={carrierLabel} trackingNumber={trackingNumber} />
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Adresse de livraison
				</EmailHeading>
				<EmailCard>
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{ ...EMAIL_STYLES.text.body, margin: 0 }}
					>
						{shippingAddress.firstName} {shippingAddress.lastName}
					</Text>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
					>
						{shippingAddress.address1}
						{shippingAddress.address2 && `, ${shippingAddress.address2}`}
					</Text>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
						{shippingAddress.postalCode} {shippingAddress.city}, {shippingAddress.country}
					</Text>
				</EmailCard>
			</Section>

			{trackingUrl && <EmailCTA href={trackingUrl}>Suivre mon colis</EmailCTA>}
		</EmailLayout>
	);
};

ShippingConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
	trackingNumber: "8N00234567890",
	trackingUrl: "https://www.laposte.fr/outils/suivre-vos-envois?code=8N00234567890",
	carrierLabel: "Colissimo",
	shippingAddress: {
		firstName: "Marie",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: "Appartement 4B",
		postalCode: "75002",
		city: "Paris",
		country: "France",
	},
} as ShippingConfirmationEmailProps;

export default ShippingConfirmationEmail;
