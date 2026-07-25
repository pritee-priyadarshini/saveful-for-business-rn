import React, { useMemo } from 'react';
import {
	Image,
	Pressable,
	StyleSheet,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { palette } from '../../theme/colors';
import { elevation } from '@/theme/elevation';
import {
	hp,
	normalize,
	useResponsiveLayout,
	wp,
} from '@/utils/responsive';
import { dashboardColumnWidth, buildDashboardShellStyles } from '@/utils/dashboardAdaptive';

const surplusCards = [
	{
		id: 'human',
		title: 'SURPLUS FOOD\nFOR PEOPLE',
		titleColor: palette.kale,
		summary: 'Suitable for charity donation &\ncommunity redistribution',
		description:
			'Edible food that is safe for human consumption and within a suitable use-by date',
		borderColor: palette.kale,
		backgroundColor: '#EEF0E6',
		buttonColor: palette.kale,
		icon: require('../../../assets/placeholder/veggie_basket.png'),
	},
	{
		id: 'livestock',
		title: 'SURPLUS FOOD FOR\nFARM LIVESTOCK',
		titleColor: palette.orange,
		summary: 'Not suitable for human consumption',
		description:
			'Food past its use-by date, food scraps or surplus suitable for livestock feed or agricultural re-use',
		borderColor: palette.orange,
		backgroundColor: '#F6EFE5',
		buttonColor: palette.eggplant,
		icon: require('../../../assets/placeholder/farmhouse.png'),
	},
] as const;

export function SurplusScreen({ navigation }: any) {
	useTransparentStatusBar('light');
	const r = useResponsiveLayout();
	const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
	const columnWidth = r.isTablet ? dashboardColumnWidth(r) : undefined;

	const handleListSurplus = (type: (typeof surplusCards)[number]['id']) => {
		if (type === 'livestock') {
			navigation.navigate('CreateFarmListing');
			return;
		}

		navigation.navigate('CreateListing');
	};

	return (
		<Screen scrollable backgroundColor={palette.creme} contentStyle={styles.screenContent} transparentTop>
			<StackHeroHeader
				title="Today's Surplus"
				height={adaptive.heroHeight}
				style={adaptive.heroBleed}
			/>

			<View
				style={[
					styles.contentWrap,
					r.isTablet && {
						width: columnWidth,
						maxWidth: r.contentMaxWidth,
						paddingHorizontal: r.pagePadH,
						gap: r.space(12, 14, 16),
					},
				]}
			>
				<AppText
					variant="label"
					color={palette.primary}
					style={[styles.subtitle, r.isTablet && { fontSize: r.font(13, 14, 14), lineHeight: 20 }]}
				>
					Firstly tell us what type of surplus food you have, so we can notify the right recipients
				</AppText>

				<View style={styles.cardsWrap}>
					{surplusCards.map((card) => (
						<View
							key={card.id}
							style={[
								styles.card,
								elevation.flat,
								r.isTablet && styles.cardTablet,
								{ borderColor: card.borderColor, backgroundColor: card.backgroundColor },
							]}
						>
							{r.isTablet ? (
								<View style={styles.cardTabletRow}>
									<Image
										source={card.icon}
										style={styles.cardIconTablet}
										resizeMode="contain"
									/>
									<View style={styles.cardTabletMain}>
										<AppText
											variant="h6"
											color={card.titleColor}
											style={[styles.cardTitle, styles.cardTitleTablet, { fontSize: r.font(17, 18, 19) }]}
										>
											{card.title.replace('\n', ' ')}
										</AppText>
										<AppText variant="label" color={palette.black} style={styles.cardSummary}>
											{card.summary.replace('\n', ' ')}
										</AppText>
										<AppText variant="body1" color={palette.midgray} style={styles.cardDescription}>
											{card.description}
										</AppText>
										<Pressable
											onPress={() => handleListSurplus(card.id)}
											style={[
												styles.actionButton,
												styles.actionButtonTablet,
												{ backgroundColor: card.buttonColor },
											]}
										>
											<AppText variant="bodyBold" color={palette.white} style={styles.buttonText}>
												LIST SURPLUS
											</AppText>
											<Ionicons
												name="arrow-forward"
												size={normalize(18)}
												color={palette.white}
												style={styles.actionArrow}
											/>
										</Pressable>
									</View>
								</View>
							) : (
								<>
									<View style={styles.cardTopRow}>
										<Image source={card.icon} style={styles.cardIcon} resizeMode="contain" />
										<AppText variant="h6" color={card.titleColor} style={styles.cardTitle}>
											{card.title}
										</AppText>
									</View>

									<AppText variant="label" color={palette.black} style={styles.cardSummary}>
										{card.summary}
									</AppText>

									<AppText variant="body1" color={palette.midgray} style={styles.cardDescription}>
										{card.description}
									</AppText>

									<Pressable
										onPress={() => handleListSurplus(card.id)}
										style={[styles.actionButton, { backgroundColor: card.buttonColor }]}
									>
										<AppText variant="bodyBold" color={palette.white} style={styles.buttonText}>
											LIST SURPLUS
										</AppText>
										<Ionicons
											name="arrow-forward"
											size={normalize(18)}
											color={palette.white}
											style={styles.actionArrow}
										/>
									</Pressable>
								</>
							)}
						</View>
					))}
				</View>

				<View style={[styles.missionCard, elevation.flat]}>
					<Image
						source={require('../../../assets/placeholder/leaf_icon.png')}
						style={[styles.leafIcon, r.isTablet && styles.leafIconTablet]}
						resizeMode="contain"
					/>

					<View style={styles.missionTextWrap}>
						<AppText variant="label" color={palette.black}>
							Our mission
						</AppText>
						<AppText variant="body1" color={palette.stone} style={{ marginTop: hp(0.3) }}>
							Maximising the value of surplus food
						</AppText>
					</View>
				</View>
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	screenContent: {
		flexGrow: 1,
		paddingBottom: hp(2.4),
	},
	contentWrap: {
		width: '100%',
		maxWidth: normalize(560),
		alignSelf: 'center',
		paddingHorizontal: wp(4.7),
		paddingTop: hp(1.9),
		gap: hp(1.8),
	},
	subtitle: {
		textAlign: 'center',
		paddingHorizontal: wp(2),
		lineHeight: normalize(22),
	},
	cardsWrap: {
		width: '100%',
		gap: hp(1.8),
	},
	card: {
		borderWidth: normalize(2),
		borderRadius: normalize(18),
		paddingVertical: hp(1.6),
		paddingHorizontal: wp(3),
		width: '100%',
	},
	cardTablet: {
		borderRadius: 14,
		paddingVertical: 16,
		paddingHorizontal: 18,
	},
	cardTabletRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 18,
		width: '100%',
	},
	cardTabletMain: {
		flex: 1,
		minWidth: 0,
		gap: 6,
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2.6),
	},
	cardIcon: {
		width: wp(23),
		height: hp(10),
	},
	cardIconTablet: {
		width: 108,
		height: 88,
		flexShrink: 0,
	},
	leafIcon: {
		width: wp(8),
		height: hp(5),
	},
	leafIconTablet: {
		width: 36,
		height: 36,
	},
	cardTitle: {
		flex: 1,
		paddingHorizontal: wp(2),
	},
	cardTitleTablet: {
		flex: 0,
		paddingHorizontal: 0,
		textTransform: 'none',
	},
	cardSummary: {
		marginTop: hp(0.6),
		lineHeight: normalize(22),
	},
	cardDescription: {
		marginTop: hp(0.35),
		lineHeight: normalize(21),
	},
	actionButton: {
		marginTop: hp(1.3),
		minHeight: hp(5),
		borderRadius: normalize(10),
		paddingHorizontal: wp(4),
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionButtonTablet: {
		alignSelf: 'flex-start',
		minWidth: 200,
		minHeight: 44,
		height: 44,
		marginTop: 10,
		borderRadius: 10,
		paddingHorizontal: 20,
	},
	buttonText: {
		letterSpacing: 0.2,
	},
	actionArrow: {
		position: 'absolute',
		right: wp(4.2),
	},
	missionCard: {
		marginTop: hp(1),
		borderRadius: normalize(14),
		borderWidth: normalize(1),
		borderColor: '#D9DED2',
		backgroundColor: palette.creme,
		paddingHorizontal: wp(4),
		paddingVertical: hp(1.2),
		flexDirection: 'row',
		alignItems: 'center',
	},
	missionTextWrap: {
		marginLeft: wp(2.8),
		flex: 1,
		minWidth: 0,
	},
});
