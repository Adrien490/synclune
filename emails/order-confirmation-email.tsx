import { formatEuro } from "@/shared/utils/format-euro";
import type { OrderItem, ShippingAddress } from "@/modules/emails/types/email.types";
import { Button, Hr, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

interface OrderConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	items: OrderItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	tax: number;
	total: number;
	shippingAddress: ShippingAddress;
	trackingUrl: string;
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
}: OrderConfirmationEmailProps) => {
	return (
		<EmailLayout preview={`Commande ${orderNumber} confirmée`}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>
					Commande confirmée
				</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, ta commande est enregistrée.
				</Text>
			</Section>

			{/* Numéro de commande */}
			<Section
				style={{
					...EMAIL_STYLES.section.card,
					marginBottom: "24px",
					textAlign: "center",
				}}
			>
				<Text style={EMAIL_STYLES.text.small}>Numéro de commande</Text>
				<Text
					style={{
						margin: "4px 0 0 0",
						fontFamily: "monospace",
						fontSize: "18px",
						fontWeight: "bold",
						color: EMAIL_COLORS.primary,
					}}
				>
					{orderNumber}
				</Text>
			</Section>

			{/* Articles */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
					Articles
				</Text>

				{items.map((item, index) => (
					<FlexRow
						key={index}
						style={{
							marginBottom: "12px",
							paddingBottom: index < items.length - 1 ? "12px" : "0",
							borderBottom:
								index < items.length - 1
									? `1px solid ${EMAIL_COLORS.border}`
									: "none",
						}}
						left={
							<>
								<Text
									style={{
										margin: 0,
										fontSize: "15px",
										fontWeight: "500",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{item.productTitle}
								</Text>
								<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}>
									{[item.skuSize, item.skuColor, item.skuMaterial]
										.filter(Boolean)
										.join(" · ")}{" "}
									× {item.quantity}
								</Text>
							</>
						}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "15px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{formatEuro(item.price * item.quantity)}
							</Text>
						}
					/>
				))}

				<Hr style={{ ...EMAIL_STYLES.hr, margin: "16px 0" }} />

				{/* Totaux */}
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={<Text style={EMAIL_STYLES.text.small}>Sous-total</Text>}
					right={
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
					}
				/>
				{discount > 0 && (
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Réduction</Text>}
						right={
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
						}
					/>
				)}
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={<Text style={EMAIL_STYLES.text.small}>Livraison</Text>}
					right={
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
					}
				/>

				<Hr style={{ ...EMAIL_STYLES.hr, margin: "12px 0" }} />

				<FlexRow
					left={<Text style={EMAIL_STYLES.heading.h3}>Total</Text>}
					right={
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
					}
				/>
			</Section>

			{/* Adresse */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Livraison
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
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={trackingUrl} style={EMAIL_STYLES.button.primary}>
					Suivre ma commande
				</Button>
			</Section>
		</EmailLayout>
	);
};

OrderConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
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
	tax: 0,
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
	trackingUrl: "https://synclune.fr/compte/commandes/example-order-id",
} as OrderConfirmationEmailProps;

export default OrderConfirmationEmail;
