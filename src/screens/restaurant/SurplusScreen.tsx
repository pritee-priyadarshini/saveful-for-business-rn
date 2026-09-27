import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AppText } from '../../components/AppText';
import { OfferToConnectionModal } from '@/components/OfferToConnectionModal';
import { ReleaseDestinationModal } from '@/components/ReleaseDestinationModal';
import { ReleaseToNetworkModal, type ReleaseWindowChoice } from '@/components/ReleaseToNetworkModal';
import { useListingsStore } from '@/store/listingsStore';
import { Screen } from '../../components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { connectionsService, type ConnectionToday } from '@/services/connections.service';
import { palette } from '../../theme/colors';
import { elevation } from '@/theme/elevation';
import {
	hp,
	normalize,
	useResponsiveLayout,
	wp,
} from '@/utils/responsive';
import { dashboardColumnWidth, buildDashboardShellStyles } from '@/utils/dashboardAdaptive';
import { useAppContext } from '@/store/AppContext';
import { useSitesStore } from '@/store/sitesStore';
import { selectCanManageBilling, useSubscriptionStore } from '@/store/subscriptionStore';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import {
	canListPreferredSurplus,
	formatWindowLabel,
	isCutoffDue,
	isReservedPublished,
	otherOpenConnections,
	windowPhase,
} from '@/utils/connections';
import { isVirtualHqSiteId } from '@/utils/defaultHqSite';
import { resolveListingSiteId } from '@/utils/listingSite';
import { showSubscriptionRequiredPrompt } from '@/utils/subscriptionAccess';

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
		title: 'SURPLUS NOT FIT FOR\nHUMAN CONSUMPTION',
		titleColor: palette.orange,
		summary: 'Suitable for livestock feed, bio energy or agricultural re-use',
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
	const { selectedRole, authUser } = useAppContext();
	const rawSites = useSitesStore((s) => s.sites);
	const entitled = useSubscriptionStore((s) => s.entitlements?.entitled === true);
	const { submitting, withLock } = useSubmitLock();
	const [today, setToday] = useState<ConnectionToday[]>([]);
	const [todayLoading, setTodayLoading] = useState(false);
	const [chooseOpen, setChooseOpen] = useState(false);
	const [releaseTarget, setReleaseTarget] = useState<ConnectionToday | null>(null);
	const [releaseChooser, setReleaseChooser] = useState<ConnectionToday | null>(null);
	const [offerTarget, setOfferTarget] = useState<{
		from: ConnectionToday;
		to: ConnectionToday;
	} | null>(null);

	const loadToday = useCallback(async () => {
		try {
			const siteIds = (rawSites ?? [])
				.map((site: any) => Number(site?.id))
				.filter((id: number) => Number.isFinite(id) && id > 0 && !isVirtualHqSiteId(id));
			const fallback = await resolveListingSiteId(authUser);
			const ids = siteIds.length ? siteIds : fallback ? [fallback] : [];
			if (!ids.length) {
				setToday([]);
				return;
			}
			setTodayLoading(true);
			const rows = await Promise.all(
				ids.map((id) => connectionsService.listTodayForSite(id).catch(() => [])),
			);
			setToday(rows.flat());
		} catch {
			setToday([]);
		} finally {
			setTodayLoading(false);
		}
	}, [authUser, rawSites]);

	useFocusEffect(
		useCallback(() => {
			void loadToday();
		}, [loadToday]),
	);

	const availableConnections = today.filter((row) => canListPreferredSurplus(row));
	const reservedConnections = today.filter((row) => isReservedPublished(row) && row.dayId);

	const openPreferredListing = (row: ConnectionToday) => {
		navigation.navigate('AddDailySurplus', {
			dayId: row.dayId,
			connectionId: row.connectionId,
			charityName: row.charityName || 'Preferred charity',
			schedule: row.schedule,
			windowStartAt: row.windowStartAt,
			windowEndAt: row.windowEndAt,
		});
	};

	const openNetworkListing = () => {
		navigation.navigate('CreateListing');
	};

	const handleListSurplus = (type: (typeof surplusCards)[number]['id']) => {
		if (selectedRole === 'restaurant_multi' && !entitled) {
			showSubscriptionRequiredPrompt({
				canManageBilling: selectCanManageBilling(),
			});
			return;
		}
		if (type === 'livestock') {
			navigation.navigate('CreateFarmListing');
			return;
		}
		if (availableConnections.length) {
			setChooseOpen(true);
			return;
		}
		openNetworkListing();
	};

	const startRelease = (row: ConnectionToday) => {
		const others = otherOpenConnections(today, row.connectionId);
		if (others.length) {
			setReleaseChooser(row);
			return;
		}
		setReleaseTarget(row);
	};

	const confirmRelease = (window: ReleaseWindowChoice) => {
		const row = releaseTarget;
		if (!row?.dayId) return;
		void withLock(async () => {
			try {
				const result = await connectionsService.releaseToNetwork(row.dayId!, {
					listingId: row.listingId,
					pickupFromTime: window?.pickupFromTime,
					pickupByTime: window?.pickupByTime,
					bestBefore: window?.bestBefore,
				});
				setReleaseTarget(null);
				useListingsStore.getState().invalidateSite();
				showSuccessAlert(result.message || 'Released to nearby charities.');
				await loadToday();
			} catch (error) {
				showErrorAlert(error, 'Could not release listing');
			}
		});
	};

	const confirmOffer = () => {
		if (!offerTarget?.from.dayId) return;
		const { from, to } = offerTarget;
		void withLock(async () => {
			try {
				const result = await connectionsService.reassignToConnection(from.dayId!, to.connectionId);
				setOfferTarget(null);
				useListingsStore.getState().invalidateSite();
				showSuccessAlert(result.message || `Reserved for ${to.charityName || 'that charity'}.`);
				await loadToday();
			} catch (error) {
				showErrorAlert(error, 'Could not move this listing');
			}
		});
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
				{todayLoading ? <ActivityIndicator color={palette.kale} /> : null}

				{availableConnections.length ? (
					<View style={[styles.dueCard, elevation.flat]}>
						<AppText variant="label" color={palette.kale}>
							{availableConnections.some((row) => windowPhase(row.windowStartAt, row.windowEndAt) === 'open')
								? 'COLLECTION WINDOW'
								: 'SCHEDULED TODAY'}
						</AppText>
						<AppText variant="h6">
							{availableConnections.length === 1
								? `${availableConnections[0].charityName || 'Preferred charity'} is scheduled to collect`
								: `${availableConnections.length} charities are scheduled to collect`}
						</AppText>
						<AppText variant="caption" color={palette.midgray}>
							{availableConnections.length === 1
								? 'List food now to reserve it for them. They only see it after you publish — not when the window starts.'
								: 'List food now to reserve it for one charity. They only see it after you publish — not when the window starts.'}
						</AppText>
						<ScrollView
							style={availableConnections.length > 2 ? styles.dueListScroll : undefined}
							nestedScrollEnabled
							keyboardShouldPersistTaps="handled"
						>
							{availableConnections.map((row, index) => {
								const window = formatWindowLabel(row.windowStartAt, row.windowEndAt) || row.schedule;
								const phase = windowPhase(row.windowStartAt, row.windowEndAt);
								return (
									<View
										key={`${row.connectionId}-${row.dayId}`}
										style={[styles.dueRow, index > 0 && styles.dueRowDivider]}
									>
										<View style={styles.dueRowCopy}>
											<AppText variant="bodyBold" numberOfLines={1}>
												{row.charityName || 'Preferred charity'}
											</AppText>
											{window ? (
												<AppText variant="caption" color={palette.stone} numberOfLines={1}>
													{phase === 'upcoming' ? `Collects ${window}` : `Collecting ${window}`}
												</AppText>
											) : null}
											<AppText variant="caption" color={palette.midgray} numberOfLines={1}>
												Not visible to them yet
											</AppText>
										</View>
										<Pressable style={styles.dueRowBtn} onPress={() => openPreferredListing(row)}>
											<AppText variant="caption" style={styles.dueRowBtnText}>
												List for them
											</AppText>
										</Pressable>
									</View>
								);
							})}
						</ScrollView>
					</View>
				) : null}

				{reservedConnections.map((row) => {
					const window = formatWindowLabel(row.windowStartAt, row.windowEndAt) || row.schedule;
					const charity = row.charityName || 'Preferred charity';
					const overdue = isCutoffDue(row.cutoffAt, row.outcome);
					return (
						<View
							key={`${row.connectionId}-${row.dayId}`}
							style={[overdue ? styles.cutoffCard : styles.waitingCard, elevation.flat]}
						>
							<AppText variant="label" color={overdue ? palette.orange : palette.primary}>
								{overdue ? 'NOT CONFIRMED' : 'RESERVED'}
							</AppText>
							<AppText variant="h6">
								{overdue ? `${charity} has not confirmed` : `Reserved for ${charity}`}
							</AppText>
							<AppText variant="bodySmall" color={palette.stone}>{window}</AppText>
							<AppText variant="caption" color={palette.midgray} style={{ marginTop: 4 }}>
								{charity} can see this now and claim it as usual. If they cannot collect, tap Release to choose where it goes.
							</AppText>
							<Pressable
								style={[styles.dueBtn, { backgroundColor: overdue ? palette.orange : palette.kale }]}
								disabled={submitting}
								onPress={() => startRelease(row)}
							>
								<AppText variant="bodyBold" color={palette.white}>
									Release
								</AppText>
							</Pressable>
						</View>
					);
				})}

				<AppText
					variant="label"
					color={palette.primary}
					style={[styles.subtitle, r.isTablet && { fontSize: r.font(13, 14, 14), lineHeight: 20 }]}
				>
					{availableConnections.length
						? 'List surplus for a connection or for nearby charities - you choose for each new listing'
						: 'Firstly tell us what type of surplus food you have, so we can notify the right recipients'}
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

			<Modal
				visible={chooseOpen}
				transparent
				animationType="fade"
				statusBarTranslucent
				onRequestClose={() => setChooseOpen(false)}
			>
				<Pressable style={styles.modalBackdrop} onPress={() => setChooseOpen(false)}>
					<Pressable style={styles.modalCard} onPress={() => undefined}>
						<AppText variant="h6">Who should see this listing?</AppText>
						<AppText variant="bodySmall" color={palette.stone} style={{ marginTop: 6, marginBottom: 12 }}>
							Only new listings. Existing listings are not changed.
						</AppText>
						<ScrollView
							style={styles.modalList}
							contentContainerStyle={styles.modalListContent}
							nestedScrollEnabled
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator
						>
							<Pressable
								style={styles.choiceBtn}
								onPress={() => {
									setChooseOpen(false);
									openNetworkListing();
								}}
							>
								<AppText variant="bodyBold">Nearby charities</AppText>
								<AppText variant="caption" color={palette.stone}>
									Open network — anyone nearby can claim
								</AppText>
							</Pressable>
							{availableConnections.map((row) => (
								<Pressable
									key={`${row.connectionId}-${row.dayId}`}
									style={styles.choiceBtn}
									onPress={() => {
										setChooseOpen(false);
										openPreferredListing(row);
									}}
								>
									<AppText variant="bodyBold">{row.charityName || 'Preferred charity'}</AppText>
									<AppText variant="caption" color={palette.stone}>
										Reserve for this connection
										{formatWindowLabel(row.windowStartAt, row.windowEndAt)
											? ` · ${formatWindowLabel(row.windowStartAt, row.windowEndAt)}`
											: ''}
									</AppText>
								</Pressable>
							))}
						</ScrollView>
						<Pressable style={styles.modalCancel} onPress={() => setChooseOpen(false)}>
							<AppText variant="bodyBold" color={palette.primary}>Cancel</AppText>
						</Pressable>
					</Pressable>
				</Pressable>
			</Modal>

			<ReleaseDestinationModal
				visible={Boolean(releaseChooser)}
				currentCharity={releaseChooser?.charityName}
				others={releaseChooser ? otherOpenConnections(today, releaseChooser.connectionId) : []}
				onClose={() => setReleaseChooser(null)}
				onOpenNetwork={() => {
					if (!releaseChooser) return;
					setReleaseTarget(releaseChooser);
					setReleaseChooser(null);
				}}
				onOfferTo={(other) => {
					if (!releaseChooser) return;
					setOfferTarget({ from: releaseChooser, to: other as ConnectionToday });
					setReleaseChooser(null);
				}}
			/>

			<OfferToConnectionModal
				visible={Boolean(offerTarget)}
				fromCharity={offerTarget?.from.charityName}
				toCharity={offerTarget?.to.charityName}
				windowStartAt={offerTarget?.to.windowStartAt}
				windowEndAt={offerTarget?.to.windowEndAt}
				submitting={submitting}
				onClose={() => setOfferTarget(null)}
				onConfirm={confirmOffer}
			/>

			<ReleaseToNetworkModal
				target={
					releaseTarget?.dayId
						? {
								dayId: releaseTarget.dayId,
								listingId: releaseTarget.listingId,
								charityName: releaseTarget.charityName,
								windowStartAt: releaseTarget.windowStartAt,
								windowEndAt: releaseTarget.windowEndAt,
							}
						: null
				}
				submitting={submitting}
				onClose={() => setReleaseTarget(null)}
				onConfirm={confirmRelease}
			/>
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
	dueCard: {
		backgroundColor: '#EEF0E6',
		borderWidth: 1,
		borderColor: palette.kale,
		borderRadius: 16,
		padding: 16,
		gap: 8,
	},
	dueListScroll: {
		maxHeight: hp(28),
	},
	dueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
	},
	dueRowDivider: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#D5DCC8',
	},
	dueRowCopy: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	dueRowBtn: {
		backgroundColor: palette.kale,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	dueRowBtnText: {
		color: palette.white,
		fontWeight: '700',
	},
	cutoffCard: {
		backgroundColor: '#FFF6EC',
		borderWidth: 1,
		borderColor: palette.orange,
		borderRadius: 16,
		padding: 16,
		gap: 6,
	},
	waitingCard: {
		backgroundColor: palette.white,
		borderWidth: 1,
		borderColor: '#D5C4F7',
		borderRadius: 16,
		padding: 16,
		gap: 4,
	},
	dueBtn: {
		marginTop: 8,
		minHeight: 44,
		borderRadius: 10,
		backgroundColor: palette.kale,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryBtn: {
		marginTop: 8,
		minHeight: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 12,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	modalCard: {
		backgroundColor: palette.white,
		borderRadius: 16,
		padding: 20,
		maxHeight: '78%',
	},
	modalList: {
		maxHeight: hp(42),
	},
	modalListContent: {
		paddingBottom: 4,
	},
	choiceBtn: {
		borderWidth: 1,
		borderColor: '#D9DED2',
		borderRadius: 12,
		padding: 12,
		marginBottom: 8,
		backgroundColor: palette.creme,
	},
	modalCancel: {
		alignItems: 'center',
		paddingTop: 8,
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
