import { formatEuro } from "@/shared/utils/format-euro";
import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface OrderItem {
	productTitle: string;
	skuColor: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	quantity: number;
	price: number;
}

interface OrderConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	items: OrderItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	tax: number;
	total: number;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
	};
	trackingUrl: string;
	orderId: string;
	invoiceGenerated: boolean;
}

export const OrderConfirmationEmail = ({
	orderNumber,
	customerName,
	items,
	subtotal,
	discount,
	shipping,
	tax,
	total,
	shippingAddress,
	trackingUrl,
	orderId,
	invoiceGenerated,
}: OrderConfirmationEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Ta commande {orderNumber} est confirmée !</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "28px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
							Créations artisanales
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text
							style={{
								...EMAIL_STYLES.heading.h2,
								textAlign: "center",
							}}
						>
							Merci pour ta commande !
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "16px" }}>
							Bonjour {customerName},
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
							Ta commande est bien enregistrée ! Je vais la préparer avec
							soin dans les prochains jours. Tu recevras un email avec le
							numéro de suivi dès l'expédition.
						</Text>
					</Section>

					{/* Numéro de commande */}
					<Section
						style={{
							...EMAIL_STYLES.section.card,
							marginBottom: "32px",
							textAlign: "center",
						}}
					>
						<Text
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: "500",
								color: EMAIL_COLORS.text.secondary,
							}}
						>
							Numéro de commande
						</Text>
						<Text
							style={{
								margin: "4px 0 0 0",
								fontFamily: "monospace",
								fontSize: "20px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							{orderNumber}
						</Text>
					</Section>

					{/* Articles */}
					<Section style={{ marginBottom: "32px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "16px" }}>
							Récapitulatif
						</Text>

						{items.map((item, index) => (
							<div key={index}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "12px",
										paddingBottom: "12px",
										borderBottom:
											index < items.length - 1
												? `1px solid ${EMAIL_COLORS.border}`
												: "none",
									}}
								>
									<div style={{ flex: 1 }}>
										<Text
											style={{
												margin: 0,
												fontSize: "16px",
												fontWeight: "500",
												color: EMAIL_COLORS.text.primary,
											}}
										>
											{item.productTitle}
										</Text>
										{item.skuSize && (
											<Text
												style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
											>
												Taille: {item.skuSize}
											</Text>
										)}
										{item.skuColor && (
											<Text style={EMAIL_STYLES.text.small}>
												Couleur: {item.skuColor}
											</Text>
										)}
										{item.skuMaterial && (
											<Text style={EMAIL_STYLES.text.small}>
												Matière: {item.skuMaterial}
											</Text>
										)}
										<Text
											style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
										>
											Quantité: {item.quantity}
										</Text>
									</div>
									<div style={{ textAlign: "right", paddingLeft: "16px" }}>
										<Text
											style={{
												margin: 0,
												fontFamily: "monospace",
												fontSize: "16px",
												fontWeight: "600",
												color: EMAIL_COLORS.text.primary,
											}}
										>
											{formatEuro(item.price * item.quantity)}
										</Text>
										{item.quantity > 1 && (
											<Text
												style={{ ...EMAIL_STYLES.text.tiny, marginTop: "4px" }}
											>
												{formatEuro(item.price)} × {item.quantity}
											</Text>
										)}
									</div>
								</div>
							</div>
						))}

						{/* Totaux */}
						<Hr style={EMAIL_STYLES.hr} />

						<div style={{ marginTop: "16px" }}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Sous-total</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "14px",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{formatEuro(subtotal)}
								</Text>
							</div>
							{discount > 0 && (
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text style={EMAIL_STYLES.text.small}>Réduction</Text>
									<Text
										style={{
											margin: 0,
											fontFamily: "monospace",
											fontSize: "14px",
											color: EMAIL_COLORS.states.success,
										}}
									>
										-{formatEuro(discount)}
									</Text>
								</div>
							)}
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Frais de port</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "14px",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{formatEuro(shipping)}
								</Text>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "16px",
								}}
							>
								<Text style={EMAIL_STYLES.text.tiny}>dont TVA (20%)</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "12px",
										color: EMAIL_COLORS.text.secondary,
									}}
								>
									{formatEuro(tax)}
								</Text>
							</div>

							<Hr style={{ ...EMAIL_STYLES.hr, margin: "16px 0" }} />

							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<Text style={{ ...EMAIL_STYLES.heading.h3, margin: 0 }}>
									Total TTC
								</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "18px",
										fontWeight: "bold",
										color: EMAIL_COLORS.primary,
									}}
								>
									{formatEuro(total)}
								</Text>
							</div>
						</div>
					</Section>

					{/* Adresse de livraison */}
					<Section style={{ marginBottom: "32px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Adresse de livraison
						</Text>
						<div style={EMAIL_STYLES.section.card}>
							<Text style={{ ...EMAIL_STYLES.text.body, margin: 0 }}>
								{shippingAddress.firstName} {shippingAddress.lastName}
							</Text>
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								{shippingAddress.address1}
							</Text>
							{shippingAddress.address2 && (
								<Text style={EMAIL_STYLES.text.small}>
									{shippingAddress.address2}
								</Text>
							)}
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								{shippingAddress.postalCode} {shippingAddress.city}
							</Text>
							<Text style={EMAIL_STYLES.text.small}>
								{shippingAddress.country}
							</Text>
						</div>
					</Section>

					{/* Prochaines étapes */}
					<Section style={{ marginBottom: "32px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "16px" }}>
							Et maintenant ?
						</Text>
						<div style={{ marginBottom: "12px" }}>
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "500",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								1. Préparation
							</Text>
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								Je prépare ta commande dans les prochains jours ouvrés.
							</Text>
						</div>
						<div style={{ marginBottom: "12px" }}>
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "500",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								2. Expédition
							</Text>
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								Tu recevras un email avec le numéro de suivi.
							</Text>
						</div>
						<div>
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "500",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								3. Réception
							</Text>
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								Tes bijoux arrivent chez toi sous 3 à 5 jours ouvrés.
							</Text>
						</div>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={trackingUrl} style={EMAIL_STYLES.button.primary}>
							Suivre ma commande
						</Button>
					</Section>

					{/* Facture */}
					{invoiceGenerated && (
						<Section
							style={{
								...EMAIL_STYLES.section.card,
								marginBottom: "32px",
								border: `1px solid ${EMAIL_COLORS.border}`,
							}}
						>
							<Text
								style={{
									margin: "0 0 12px 0",
									textAlign: "center",
									fontSize: "16px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								📄 Ta facture
							</Text>
							<Text
								style={{
									...EMAIL_STYLES.text.small,
									marginBottom: "16px",
									textAlign: "center",
								}}
							>
								Ta facture a été générée et t'a été envoyée par email séparément.
								Tu peux également la consulter dans ton espace client.
							</Text>
							<div style={{ textAlign: "center" }}>
								<Button
									href={trackingUrl}
									style={EMAIL_STYLES.button.outline}
								>
									Voir ma facture
								</Button>
							</div>
						</Section>
					)}

					{/* Message personnel */}
					<Section
						style={{
							...EMAIL_STYLES.section.highlighted,
							marginBottom: "24px",
						}}
					>
						<Text
							style={{
								margin: 0,
								textAlign: "center",
								fontSize: "14px",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							<strong>Merci pour ta confiance !</strong>
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								marginTop: "8px",
								textAlign: "center",
							}}
						>
							Chaque bijou est créé avec attention. N'hésite pas à me contacter
							si tu as des questions.
						</Text>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
						}}
					>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								textAlign: "center",
							}}
						>
							Des questions ? Répondez à cet email ou contactez-moi à{" "}
							<a href="mailto:contact@synclune.fr" style={EMAIL_STYLES.link}>
								contact@synclune.fr
							</a>
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								marginTop: "16px",
								textAlign: "center",
							}}
						>
							Synclune
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "8px",
								textAlign: "center",
							}}
						>
							© {new Date().getFullYear()} Synclune - Tous droits réservés
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

OrderConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie Dupont",
	items: [
		{
			productTitle: "Collier Luna en Or Rose",
			skuColor: "Or Rose",
			skuMaterial: "Or 18 carats",
			skuSize: "45cm",
			quantity: 1,
			price: 8900,
		},
		{
			productTitle: "Boucles d'oreilles Étoile",
			skuColor: "Argent",
			skuMaterial: "Argent 925",
			skuSize: null,
			quantity: 2,
			price: 4500,
		},
	],
	subtotal: 17900,
	discount: 0,
	shipping: 490,
	tax: 3065,
	total: 18390,
	shippingAddress: {
		firstName: "Marie",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: "Appartement 4B",
		postalCode: "75002",
		city: "Paris",
		country: "France",
	},
	trackingUrl: "https://synclune.fr/orders/example-order-id",
} as OrderConfirmationEmailProps;

export default OrderConfirmationEmail;
