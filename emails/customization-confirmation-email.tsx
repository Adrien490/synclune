import { Column, Img, Row, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface CustomizationConfirmationEmailProps {
	firstName: string;
	productTypeLabel: string;
	details: string;
	inspirationProducts?: Array<{ title: string }>;
	inspirationMedias?: Array<{ url: string; altText?: string }>;
	shopUrl: string;
}

export const CustomizationConfirmationEmail = ({
	firstName,
	productTypeLabel,
	details,
	inspirationProducts,
	inspirationMedias,
	shopUrl,
}: CustomizationConfirmationEmailProps) => {
	const hasInspirations = inspirationProducts && inspirationProducts.length > 0;
	const hasMedias = inspirationMedias && inspirationMedias.length > 0;

	return (
		<EmailLayout preview={`Votre demande de ${productTypeLabel} personnalisé est bien enregistrée`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Demande reçue</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {firstName}, votre demande de {productTypeLabel} personnalisé est bien
					enregistrée. Je reviens vers vous dès que possible.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Type de création
				</Text>
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
			</EmailCard>

			{hasInspirations && (
				<Section style={{ marginBottom: "24px" }}>
					<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
						Inspirations
					</EmailHeading>
					<EmailCard>
						{inspirationProducts.map((product) => (
							<Text
								key={product.title}
								className={EMAIL_CLASSES.text.secondary}
								style={EMAIL_STYLES.text.small}
							>
								• {product.title}
							</Text>
						))}
					</EmailCard>
				</Section>
			)}

			{hasMedias && (
				<Section style={{ marginBottom: "24px" }}>
					<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
						Vos images d'inspiration
					</EmailHeading>
					<EmailCard>
						{Array.from({ length: Math.ceil(inspirationMedias.length / 2) }, (_, rowIndex) => (
							<Row key={rowIndex} role="presentation" style={{ marginBottom: "8px" }}>
								{inspirationMedias.slice(rowIndex * 2, rowIndex * 2 + 2).map((media) => (
									<Column
										key={media.url}
										style={{
											width: "50%",
											paddingRight: "4px",
											paddingLeft: "4px",
											verticalAlign: "top",
										}}
									>
										<Img
											src={media.url}
											alt={media.altText ?? "Image d'inspiration"}
											width={200}
											style={{
												borderRadius: "8px",
												width: "100%",
												maxWidth: "200px",
												height: "auto",
											}}
										/>
									</Column>
								))}
							</Row>
						))}
					</EmailCard>
				</Section>
			)}

			<Section style={{ marginBottom: "32px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Description
				</EmailHeading>
				<EmailCard>
					{details.split("\n").map((line, i) => (
						<Text
							key={i}
							className={EMAIL_CLASSES.text.body}
							style={{
								...EMAIL_STYLES.text.small,
								color: EMAIL_STYLES.text.body.color,
								lineHeight: "1.6",
							}}
						>
							{line || "\u00A0"}
						</Text>
					))}
				</EmailCard>
			</Section>

			<EmailCTA href={shopUrl}>Découvrir nos créations</EmailCTA>
		</EmailLayout>
	);
};

CustomizationConfirmationEmail.PreviewProps = {
	firstName: "Marie",
	productTypeLabel: "Collier",
	details:
		"Je souhaiterais un collier personnalisé avec les initiales 'ML' gravées sur un pendentif rond en argent.",
	inspirationProducts: [{ title: "Collier Lune Céleste" }],
	inspirationMedias: [
		{
			url: "https://placehold.co/400x400/e8d5c4/333333?text=Inspiration+1",
			altText: "Collier en or",
		},
		{
			url: "https://placehold.co/400x400/d5c4e8/333333?text=Inspiration+2",
			altText: "Pendentif argent",
		},
	],
	shopUrl: "https://synclune.fr/creations",
} as CustomizationConfirmationEmailProps;

export default CustomizationConfirmationEmail;
