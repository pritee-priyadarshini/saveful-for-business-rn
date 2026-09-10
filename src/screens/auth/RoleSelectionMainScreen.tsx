import React, { useMemo } from 'react';
import {
	Image,
	Linking,
	Pressable,
	StyleSheet,
	View,
	ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { AuthStackParamList } from '../../navigation/types';
import { useAppContext } from '../../store/AppContext';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelectionMain'>;

const SURPLUS_PORTAL_URL = 'https://enterprise.saveful.app/';

const roleCards = [
	{
		id: 'charity_single' as const,
		illustration: require('../../../assets/placeholder/truck.png'),
		title: 'I COLLECT & RECOVER FOOD',
		subTitle: 'For Charities, farmers & circular solutions',
		description:
			'Collect surplus edible food to help communities in need. Or collect non-edible to be used for livestock feed or circular solutions.',
		borderColor: palette.eggplant,
		titleColor: palette.kale,
		buttonColor: palette.eggplant,
		iconBgColor: palette.eggplant,
		role: 'charity_single' as const,
		action: 'signup' as const,
		roundIcon: require('../../../assets/placeholder/charity_icon.png'),
	},
	{
		id: 'restaurant_single' as const,
		illustration: require('../../../assets/placeholder/site_icon.png'),
		title: 'I HAVE SURPLUS FOOD',
		subTitle: 'For Businesses, venues & farms',
		description:
			'List surplus edible food for charities to help communities in need. Or list non-edible to be recovered for livestock feed and circular solutions.',
		portalNote: 'Log in to set up account via secure online portal',
		borderColor: palette.kale,
		titleColor: palette.kale,
		buttonColor: palette.kale,
		iconBgColor: palette.kale,
		role: 'restaurant_single' as const,
		action: 'portal' as const,
		roundIcon: require('../../../assets/placeholder/restaurant_icon.png'),
	},
];

export function RoleSelectionMainScreen({ navigation }: Props) {
	const { setRole, setRoleFlow } = useAppContext();
	const insets = useSafeAreaInsets();
	const r = useResponsiveLayout();
	useTransparentStatusBar('light');

	const onContinue = (card: (typeof roleCards)[number]) => {
		if (card.action === 'portal') {
			void Linking.openURL(SURPLUS_PORTAL_URL);
			return;
		}
		setRoleFlow('consumer');
		setRole(card.role);
		navigation.navigate('RoleSelection');
	};

	const tablet = useMemo(() => {
		if (!r.isTablet) return null;
		return {
			screenContent: {
				flexGrow: 1,
				paddingBottom: Math.max(insets.bottom, spacing.sm),
			},
			heroHeight: Math.min(r.height * (r.isLandscape ? 0.16 : 0.14), r.isLandscape ? 130 : 150),
			headerText: {
				maxWidth: r.contentMaxWidth,
				fontSize: r.font(18, 20, 22),
				lineHeight: r.font(22, 26, 28),
			},
			content: {
				paddingHorizontal: r.pagePadH,
				paddingTop: r.space(12, 14, 16),
				gap: r.space(12, 14, 16),
				flex: 1,
				width: '100%' as const,
				maxWidth: r.contentMaxWidth,
				alignSelf: 'center' as const,
			},
			subtitle: {
				fontSize: r.font(14, 15, 16),
				lineHeight: r.font(20, 22, 24),
				paddingHorizontal: 0,
			},
			card: {
				paddingVertical: r.space(14, 16, 18),
				paddingHorizontal: r.space(16, 18, 20),
				borderRadius: 18,
				flex: 1,
			},
			roundIconWrap: {
				width: 56,
				height: 56,
				borderRadius: 28,
			},
			roundIcon: {
				width: 56,
				height: 56,
			},
			illustration: {
				width: 120,
				height: 80,
			},
			cardTitle: {
				fontSize: r.font(16, 18, 19),
				lineHeight: r.font(22, 24, 26),
			},
			cardDescription: {
				fontSize: r.font(14, 15, 15),
				lineHeight: r.font(20, 22, 22),
			},
			continueButton: {
				minHeight: 48,
				paddingVertical: 12,
				borderRadius: 12,
				marginTop: 'auto' as const,
			},
		};
	}, [r, insets.bottom]);

	return (
		<Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
			<StatusBar style="light" translucent backgroundColor="transparent" />
			<ScrollView
				contentContainerStyle={[styles.screenContent, tablet?.screenContent]}
				showsVerticalScrollIndicator={false}
				bounces={false}
			>
				<HeroHeader
					source={require('../../../assets/placeholder/kale-headera.png')}
					height={tablet?.heroHeight ?? hp(16)}
					padContentRight={false}
					contentStyle={styles.headerContent}
				>
					<View style={styles.headerTextBlock}>
						<AppText
							variant="h5"
							color={palette.white}
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.7}
							style={[styles.headerText, styles.headerLead, tablet?.headerText]}
						>
							GOOD FOOD SHOULD GO FURTHER
						</AppText>
						<AppText
							variant="h5"
							color={palette.white}
							style={[styles.headerText, tablet?.headerText]}
						>
							{`SAVEFUL FOR BUSINESS\nMAKES IT EASIER`}
						</AppText>
					</View>
				</HeroHeader>

				<View style={[styles.content, tablet?.content]}>
					<AppText variant="bodyBold" color={palette.primary} style={[styles.subtitle, tablet?.subtitle]}>
						Please choose from the options below to help us personalise your experience and connect you
						with the right community
					</AppText>

					{roleCards.map((card) => (
						<View key={card.id} style={[styles.card, { borderColor: card.borderColor }, tablet?.card]}>
							<View style={styles.cardTopRow}>
								<View
									style={[
										styles.roundIconWrap,
										{ backgroundColor: card.iconBgColor },
										tablet?.roundIconWrap,
									]}
								>
									<Image
										source={card.roundIcon}
										style={[styles.roundIcon, tablet?.roundIcon]}
										resizeMode="contain"
									/>
								</View>

								<Image
									source={card.illustration}
									style={[styles.illustration, tablet?.illustration]}
									resizeMode="contain"
								/>
							</View>

							<AppText variant="bodyBold1" color={palette.primary} style={styles.cardSubTitle}>
								{card.subTitle}
							</AppText>

							<AppText
								variant="h8"
								color={card.titleColor}
								style={[styles.cardTitle, tablet?.cardTitle]}
							>
								{card.title}
							</AppText>

							<AppText
								variant="body1"
								color={palette.primary}
								style={[styles.cardDescription, tablet?.cardDescription]}
							>
								{card.description}
							</AppText>

							{card.portalNote ? (
								<AppText variant="bodyBold" color={palette.kale} style={styles.portalNote}>
									{card.portalNote}
								</AppText>
							) : null}

							<Pressable
								onPress={() => onContinue(card)}
								style={[
									styles.continueButton,
									{ backgroundColor: card.buttonColor },
									tablet?.continueButton,
								]}
							>
								<AppText variant="bodyBold" color={palette.white} style={styles.continueLabel}>
									CONTINUE
								</AppText>
								<View style={styles.continueArrow}>
									<Ionicons name="arrow-forward" size={16} color={palette.white} />
								</View>
							</Pressable>
						</View>
					))}

					<View style={styles.loginRow}>
						<AppText variant="bodySmall" color={palette.textMuted} style={styles.loginPrompt}>
							Already have an account?
						</AppText>
						<Pressable
							onPress={() => navigation.navigate('SignIn')}
							hitSlop={8}
						>
							<AppText variant="bodyBold" color={palette.primary} style={styles.loginLink}>
								Log in
							</AppText>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	screenContent: {
		flexGrow: 1,
		backgroundColor: palette.creme,
		paddingBottom: hp(1.5),
	},

	headerContent: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: wp(6),
	},
	headerTextBlock: {
		width: '100%',
		alignItems: 'center',
	},
	headerText: {
		width: '100%',
		maxWidth: wp(92),
		textAlign: 'center',
	},
	headerLead: {
		fontSize: normalize(15),
		lineHeight: normalize(18),
		letterSpacing: 0,
	},
	content: {
		flex: 1,
		paddingHorizontal: wp(4.5),
		paddingTop: hp(1.2),
		gap: hp(1.3),
	},

	subtitle: {
		textAlign: 'center',
		paddingHorizontal: wp(4),
	},
	card: {
		flex: 1,
		borderWidth: normalize(2),
		borderRadius: normalize(16),
		backgroundColor: '#F3F3EC',
		paddingVertical: hp(1.4),
		paddingHorizontal: wp(3.4),
		width: '100%',
		justifyContent: 'space-between',
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	roundIconWrap: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	roundIcon: {
		width: 56,
		height: 56,
	},
	illustration: {
		width: 110,
		height: 76,
		marginLeft: 'auto',
	},
	cardSubTitle: {
		marginTop: hp(0.6),
		lineHeight: normalize(20),
	},
	cardTitle: {
		marginTop: hp(0.3),
	},
	cardDescription: {
		marginTop: hp(0.4),
	},
	portalNote: {
		marginTop: hp(0.7),
		textAlign: 'center',
	},
	loginRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: wp(1.5),
		marginTop: hp(0.2),
		paddingBottom: hp(0.6),
	},
	loginPrompt: {
		textTransform: 'none',
	},
	loginLink: {
		textTransform: 'none',
		textDecorationLine: 'underline',
	},
	continueButton: {
		marginTop: hp(1),
		borderRadius: normalize(10),
		minHeight: 48,
		paddingVertical: 12,
		paddingHorizontal: spacing.lg,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
	},
	continueLabel: {
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	continueArrow: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: 'rgba(255,255,255,0.22)',
		alignItems: 'center',
		justifyContent: 'center',
	},
});
