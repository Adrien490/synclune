import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface CustomizationConfirmationEmailProps {
	firstName: string;
	productTypeLabel: string;
	details: string;
	inspirationProducts?: Array<{ title: string }>;
	preferredColors?: Array<{ name: string; hex: string }>;
	preferredMaterials?: Array<{ name: string }>;
}

export const CustomizationConfirmationEmail = ({
	firstName,
	productTypeLabel,
	details,
	inspirationProducts,
	preferredColors,
	preferredMaterials,
}: CustomizationConfirmationEmailProps) => {
	const hasPreferences =
		(inspirationProducts && inspirationProducts.length > 0) ||
		(preferredColors && preferredColors.length > 0) ||
		(preferredMaterials && preferredMaterials.length > 0);

	return (
		<Html>
			<Head />
			<Preview>Demande de personnalisation reçue</Preview>
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
						<Text style={EMAIL_STYLES.heading.h2}>Demande reçue</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {firstName}, ta demande de {productTypeLabel} personnalisé
							est bien enregistrée. Je te recontacte sous 48h.
						</Text>
					</Section>

					{/* Type de produit */}
					<Section
						style={{
							...EMAIL_STYLES.section.card,
							marginBottom: "24px",
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.small}>Type de création</Text>
						<Text
							style={{
								margin: "4px 0 0 0",
								fontSize: "18px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							{productTypeLabel}
						</Text>
					</Section>

					{/* Préférences */}
					{hasPreferences && (
						<Section style={{ marginBottom: "24px" }}>
							<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
								Préférences
							</Text>
							<div style={EMAIL_STYLES.section.card}>
								{inspirationProducts && inspirationProducts.length > 0 && (
									<div style={{ marginBottom: "12px" }}>
										<Text
											style={{
												...EMAIL_STYLES.text.small,
												fontWeight: "600",
												marginBottom: "4px",
											}}
										>
											Inspirations
										</Text>
										{inspirationProducts.map((product, index) => (
											<Text key={index} style={EMAIL_STYLES.text.small}>
												• {product.title}
											</Text>
										))}
									</div>
								)}
								{preferredColors && preferredColors.length > 0 && (
									<div style={{ marginBottom: "12px" }}>
										<Text
											style={{
												...EMAIL_STYLES.text.small,
												fontWeight: "600",
												marginBottom: "4px",
											}}
										>
											Couleurs
										</Text>
										<Text style={EMAIL_STYLES.text.small}>
											{preferredColors.map((c) => c.name).join(", ")}
										</Text>
									</div>
								)}
								{preferredMaterials && preferredMaterials.length > 0 && (
									<div>
										<Text
											style={{
												...EMAIL_STYLES.text.small,
												fontWeight: "600",
												marginBottom: "4px",
											}}
										>
											Matériaux
										</Text>
										<Text style={EMAIL_STYLES.text.small}>
											{preferredMaterials.map((m) => m.name).join(", ")}
										</Text>
									</div>
								)}
							</div>
						</Section>
					)}

					{/* Description */}
					<Section style={{ marginBottom: "32px" }}>
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

CustomizationConfirmationEmail.PreviewProps = {
	firstName: "Marie",
	productTypeLabel: "Collier",
	details:
		"Je souhaiterais un collier personnalisé avec les initiales 'ML' gravées sur un pendentif rond en argent.",
	inspirationProducts: [{ title: "Collier Lune Céleste" }],
	preferredColors: [{ name: "Argent", hex: "#C0C0C0" }],
	preferredMaterials: [{ name: "Argent 925" }],
} as CustomizationConfirmationEmailProps;

export default CustomizationConfirmationEmail;
