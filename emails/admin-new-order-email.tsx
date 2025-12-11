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

interface AdminNewOrderEmailProps {
	orderNumber: string;
	customerName: string;
	customerEmail: string;
	items: OrderItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	total: number;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
		phone: string;
	};
	dashboardUrl: string;
}

export const AdminNewOrderEmail = ({
	orderNumber,
	customerName,
	customerEmail,
	items,
	subtotal,
	discount,
	shipping,
	total,
	shippingAddress,
	dashboardUrl,
}: AdminNewOrderEmailProps) => {
	const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<Html>
			<Head />
			<Preview>
				Nouvelle commande {orderNumber} - {formatEuro(total)}
			</Preview>
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
							Nouvelle Commande
						</Text>
					</Section>

					{/* Résumé */}
					<Section style={{ marginBottom: "24px" }}>
						<div style={EMAIL_STYLES.section.card}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Commande</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "14px",
										fontWeight: "bold",
										color: EMAIL_COLORS.primary,
									}}
								>
									{orderNumber}
								</Text>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Montant</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "14px",
										fontWeight: "bold",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{formatEuro(total)}
								</Text>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<Text style={EMAIL_STYLES.text.small}>Articles</Text>
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										fontWeight: "bold",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{totalItems} article{totalItems > 1 ? "s" : ""}
								</Text>
							</div>
						</div>
					</Section>

					{/* Client */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Client
						</Text>
						<div style={EMAIL_STYLES.section.card}>
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{customerName}
							</Text>
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								{customerEmail}
							</Text>
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
								{shippingAddress.phone}
							</Text>
						</div>
					</Section>

					{/* Adresse */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Adresse de livraison
						</Text>
						<div style={EMAIL_STYLES.section.card}>
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
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

					{/* Articles */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Articles
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
												fontSize: "14px",
												fontWeight: "600",
												color: EMAIL_COLORS.text.primary,
											}}
										>
											{item.productTitle}
										</Text>
										{item.skuSize && (
											<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
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
											style={{
												margin: 0,
												marginTop: "4px",
												fontSize: "14px",
												fontWeight: "600",
												color: EMAIL_COLORS.primary,
											}}
										>
											Qté: {item.quantity}
										</Text>
									</div>
									<div style={{ textAlign: "right", paddingLeft: "16px" }}>
										<Text
											style={{
												margin: 0,
												fontFamily: "monospace",
												fontSize: "14px",
												fontWeight: "600",
												color: EMAIL_COLORS.text.primary,
											}}
										>
											{formatEuro(item.price * item.quantity)}
										</Text>
									</div>
								</div>
							</div>
						))}

						<Hr style={{ borderColor: EMAIL_COLORS.border, margin: "16px 0" }} />

						<div>
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
											color: EMAIL_COLORS.primary,
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
									marginBottom: "16px",
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

							<Hr style={{ borderColor: EMAIL_COLORS.border, margin: "12px 0" }} />

							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<Text
									style={{
										margin: 0,
										fontSize: "16px",
										fontWeight: "bold",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									Total
								</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "16px",
										fontWeight: "bold",
										color: EMAIL_COLORS.primary,
									}}
								>
									{formatEuro(total)}
								</Text>
							</div>
						</div>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={dashboardUrl} style={EMAIL_STYLES.button.primary}>
							Voir dans le Dashboard
						</Button>
					</Section>

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

AdminNewOrderEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie Dupont",
	customerEmail: "marie.dupont@example.com",
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
	total: 18390,
	shippingAddress: {
		firstName: "Marie",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: "Appartement 4B",
		postalCode: "75002",
		city: "Paris",
		country: "France",
		phone: "+33 6 12 34 56 78",
	},
	dashboardUrl: "https://synclune.fr/dashboard/orders/clxxx12345",
} as AdminNewOrderEmailProps;

export default AdminNewOrderEmail;
