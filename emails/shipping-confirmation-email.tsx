import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
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
	estimatedDelivery?: string;
}

export const ShippingConfirmationEmail = ({
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	shippingAddress,
	estimatedDelivery,
}: ShippingConfirmationEmailProps) => {
	return (
		<EmailLayout preview={`Commande ${orderNumber} expédiée`}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Commande expédiée</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, votre commande {orderNumber} est en route.
				</Text>
			</Section>

			{/* Suivi */}
			<Section style={{ marginBottom: "24px" }}>
				<TrackingInfo
					carrierLabel={carrierLabel}
					trackingNumber={trackingNumber}
					estimatedDelivery={estimatedDelivery}
				/>
			</Section>

			{/* Adresse */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Adresse de livraison
				</Text>
				<div style={EMAIL_STYLES.section.card}>
					<Text style={{ ...EMAIL_STYLES.text.body, margin: 0 }}>
						{shippingAddress.firstName} {shippingAddress.lastName}
					</Text>
					<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
						{shippingAddress.address1}
						{shippingAddress.address2 && `, ${shippingAddress.address2}`}
					</Text>
					<Text style={EMAIL_STYLES.text.small}>
						{shippingAddress.postalCode} {shippingAddress.city},{" "}
						{shippingAddress.country}
					</Text>
				</div>
			</Section>

			{/* CTA */}
			{trackingUrl && (
				<Section style={{ marginBottom: "32px", textAlign: "center" }}>
					<Button href={trackingUrl} style={EMAIL_STYLES.button.primary}>
						Suivre mon colis
					</Button>
				</Section>
			)}
		</EmailLayout>
	);
};

ShippingConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
	trackingNumber: "8N00234567890",
	trackingUrl:
		"https://www.laposte.fr/outils/suivre-vos-envois?code=8N00234567890",
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
	estimatedDelivery: "3-5 jours ouvrés",
} as ShippingConfirmationEmailProps;

export default ShippingConfirmationEmail;
