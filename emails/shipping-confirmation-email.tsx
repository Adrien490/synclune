import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

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
		<Html>
			<Head />
			<Preview>Commande {orderNumber} expédiée</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.heading.h2}>Commande expédiée</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {customerName}, ta commande {orderNumber} est en route.
						</Text>
					</Section>

					{/* Suivi */}
					<Section style={{ marginBottom: "24px" }}>
						<div style={EMAIL_STYLES.section.card}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Transporteur</Text>
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										fontWeight: "600",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{carrierLabel}
								</Text>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: estimatedDelivery ? "8px" : "0",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Numéro de suivi</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "14px",
										fontWeight: "600",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{trackingNumber}
								</Text>
							</div>
							{estimatedDelivery && (
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
									}}
								>
									<Text style={EMAIL_STYLES.text.small}>Livraison estimée</Text>
									<Text
										style={{
											margin: 0,
											fontSize: "14px",
											fontWeight: "600",
											color: EMAIL_COLORS.primary,
										}}
									>
										{estimatedDelivery}
									</Text>
								</div>
							)}
						</div>
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

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
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
