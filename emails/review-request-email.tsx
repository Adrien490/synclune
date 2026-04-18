import { Column, Hr, Img, Link, Row, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface ReviewableProduct {
	title: string;
	slug: string;
	imageUrl: string | null;
	skuVariants: string | null;
}

interface ReviewRequestEmailProps {
	customerName: string;
	orderNumber: string;
	products: ReviewableProduct[];
	reviewUrl: string;
	unsubscribeUrl: string;
}

export const ReviewRequestEmail = ({
	customerName,
	orderNumber,
	products,
	reviewUrl,
	unsubscribeUrl,
}: ReviewRequestEmailProps) => {
	const singleProduct = products.length === 1;
	const previewText = singleProduct
		? `Que pensez-vous de ${products[0]!.title} ?`
		: `Donnez votre avis sur votre commande ${orderNumber}`;

	return (
		<EmailLayout
			preview={previewText}
			footer={
				<>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
						Merci pour votre confiance !
					</Text>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
						<Link
							href={unsubscribeUrl}
							style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}
						>
							Se désinscrire des emails commerciaux
						</Link>
					</Text>
				</>
			}
		>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">
					{singleProduct ? "Votre avis compte !" : "Vos avis comptent !"}
				</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName},
				</Text>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}
				>
					{singleProduct
						? "Votre commande a bien été livrée. Nous espérons que votre création vous plaît !"
						: "Votre commande a bien été livrée. Nous espérons que vos créations vous plaisent !"}
				</Text>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}
				>
					Prenez quelques instants pour partager votre expérience. Votre avis aide d'autres clientes
					à faire leur choix et nous permet d'améliorer nos créations.
				</Text>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "16px" }}>
					{singleProduct ? "Votre création" : "Vos créations"}
				</EmailHeading>

				{products.map((product, index) => (
					<Row
						role="presentation"
						key={product.slug}
						style={{
							marginBottom: index < products.length - 1 ? "16px" : "0",
							paddingBottom: index < products.length - 1 ? "16px" : "0",
							borderBottom:
								index < products.length - 1 ? `1px solid ${EMAIL_COLORS.border}` : "none",
						}}
					>
						{product.imageUrl && (
							<Column style={{ width: "80px", verticalAlign: "middle" }}>
								<Img
									src={product.imageUrl}
									alt={product.title}
									width={80}
									height={80}
									style={{
										borderRadius: "8px",
									}}
								/>
							</Column>
						)}
						<Column
							style={{
								verticalAlign: "middle",
								paddingLeft: product.imageUrl ? "16px" : "0",
							}}
						>
							<Text
								className={EMAIL_CLASSES.text.body}
								style={{
									margin: 0,
									fontSize: "16px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{product.title}
							</Text>
							{product.skuVariants && (
								<Text
									className={EMAIL_CLASSES.text.secondary}
									style={{
										...EMAIL_STYLES.text.small,
										marginTop: "4px",
									}}
								>
									{product.skuVariants}
								</Text>
							)}
						</Column>
					</Row>
				))}
			</Section>

			<Hr style={{ ...EMAIL_STYLES.hr, margin: "24px 0" }} />

			<EmailCard style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{
						...EMAIL_STYLES.text.body,
						marginTop: "12px",
						fontStyle: "italic",
					}}
				>
					Chaque avis est lu avec attention et contribue
					<br />à faire grandir notre petite marque artisanale.
				</Text>
			</EmailCard>

			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<EmailCTA href={reviewUrl} marginBottom="12px">
					Donner mon avis
				</EmailCTA>
				<Text
					className={EMAIL_CLASSES.text.secondary}
					style={{
						...EMAIL_STYLES.text.tiny,
					}}
				>
					Cela ne prend que 2 minutes
				</Text>
			</Section>
		</EmailLayout>
	);
};

ReviewRequestEmail.PreviewProps = {
	customerName: "Marie",
	orderNumber: "CMD-1730000000-ABCD",
	products: [
		{
			title: "Collier Luna en Or Rose",
			slug: "collier-luna-or-rose",
			imageUrl: "https://synclune.fr/images/products/collier-luna.jpg",
			skuVariants: "Or Rose · 45cm",
		},
		{
			title: "Boucles d'oreilles Étoile",
			slug: "boucles-oreilles-etoile",
			imageUrl: "https://synclune.fr/images/products/boucles-etoile.jpg",
			skuVariants: "Argent 925",
		},
	],
	reviewUrl: "https://synclune.fr/commandes",
	unsubscribeUrl: "https://synclune.fr/notifications/desinscription",
} as ReviewRequestEmailProps;

export default ReviewRequestEmail;
