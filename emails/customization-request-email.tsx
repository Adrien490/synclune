import { Button, Link, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

interface CustomizationRequestEmailProps {
	firstName: string;
	email: string;
	phone?: string;
	productTypeLabel: string;
	details: string;
	inspirationProducts?: Array<{ title: string }>;
}

export const CustomizationRequestEmail = ({
	firstName,
	email,
	phone,
	productTypeLabel,
	details,
	inspirationProducts,
}: CustomizationRequestEmailProps) => {
	return (
		<EmailLayout
			preview={`Demande de personnalisation de ${firstName}`}
			headerText="Nouvelle demande"
		>
			{/* Client */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
					Client
				</Text>
				<div style={EMAIL_STYLES.section.card}>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Prénom</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{firstName}
							</Text>
						}
					/>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Email</Text>}
						right={
							<Link
								href={`mailto:${email}`}
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.primary,
									textDecoration: "none",
								}}
							>
								{email}
							</Link>
						}
					/>
					{phone && (
						<FlexRow
							style={{ marginBottom: "8px" }}
							left={<Text style={EMAIL_STYLES.text.small}>Téléphone</Text>}
							right={
								<Link
									href={`tel:${phone}`}
									style={{
										margin: 0,
										fontSize: "14px",
										color: EMAIL_COLORS.primary,
										textDecoration: "none",
									}}
								>
									{phone}
								</Link>
							}
						/>
					)}
					<FlexRow
						left={<Text style={EMAIL_STYLES.text.small}>Type</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "600",
									color: EMAIL_COLORS.primary,
								}}
							>
								{productTypeLabel}
							</Text>
						}
					/>
				</div>
			</Section>

			{/* Inspirations */}
			{inspirationProducts && inspirationProducts.length > 0 && (
				<Section style={{ marginBottom: "24px" }}>
					<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
						Inspirations
					</Text>
					<div style={EMAIL_STYLES.section.card}>
						{inspirationProducts.map((product, index) => (
							<Text key={index} style={EMAIL_STYLES.text.small}>
								• {product.title}
							</Text>
						))}
					</div>
				</Section>
			)}

			{/* Détails */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Description
				</Text>
				<div style={EMAIL_STYLES.section.card}>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							color: EMAIL_COLORS.text.primary,
							whiteSpace: "pre-wrap",
							lineHeight: "1.6",
						}}
					>
						{details}
					</Text>
				</div>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button
					href={`mailto:${email}?subject=RE: Demande de personnalisation - Synclune`}
					style={EMAIL_STYLES.button.primary}
				>
					Répondre au client
				</Button>
			</Section>
		</EmailLayout>
	);
};

CustomizationRequestEmail.PreviewProps = {
	firstName: "Marie",
	email: "marie.dupont@example.com",
	phone: "+33612345678",
	productTypeLabel: "Collier",
	details:
		"Bonjour,\n\nJe souhaiterais un collier personnalisé avec les initiales de ma fille gravées sur un pendentif rond en argent. Les initiales seraient 'ML' en écriture cursive. J'aimerais que le pendentif fasse environ 2cm de diamètre.\n\nPouvez-vous me faire un devis et m'indiquer les délais de réalisation ?\n\nMerci d'avance !",
	inspirationProducts: [
		{ title: "Collier Lune Céleste" },
		{ title: "Pendentif Étoile Filante" },
	],
} as CustomizationRequestEmailProps;

export default CustomizationRequestEmail;
