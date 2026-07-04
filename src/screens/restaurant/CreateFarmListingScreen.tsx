import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';
import { foodListingService } from '../../services/foodListing.service';
import { useListingsStore } from '../../store/listingsStore';
import { formatApiError, getSitePickupCoords, getSitePostcode } from '../../utils/listingLocation';
import { resolveListingSiteId } from '../../utils/listingSite';
import { estimateCo2AvoidedKg, estimateMealsSaved, formatCo2AvoidedKg } from '../../utils/foodListing';
import { useSubmitLock } from '../../hooks/useSubmitLock';
import { usePreviousListingRelist } from '../../hooks/usePreviousListingRelist';
import { getFarmRelistFormValues } from '../../utils/listingRelist';
import {
  getListingDateErrors,
  getListingFoodItemsError,
  hasListingDateErrors,
  type ListingDateFieldErrors,
} from '../../utils/listingDateValidation';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const STORAGE_COLS = 4;
const CONTAMINANT_COLS = 3;
const PAGE_H_PAD_PERCENT = 4.2;
const GRID_GAP_PERCENT = 1.2;

const getGridLayout = (winWidth: number) => {
  const pagePad = (winWidth * PAGE_H_PAD_PERCENT) / 100 * 2;
  const gap = Math.round((winWidth * GRID_GAP_PERCENT) / 100);
  const border = Math.round((winWidth / 375) * 2);
  const contentW = winWidth - pagePad;
  const colWidth = (cols: number) =>
    Math.floor((contentW - gap * (cols - 1)) / cols) - border;
  return {
    gap,
    storageWidth: colWidth(STORAGE_COLS),
    contaminantWidth: colWidth(CONTAMINANT_COLS),
  };
};

// Farm accent colour – orange
const FARM_ACCENT = palette.orange;
const FARM_BG = palette.surface;

type Step = 1 | 2 | 3;
type PickerTarget = 'bestBefore' | 'from' | 'to' | null;

type FarmItem = {
  name: string;
  qty: number;
  icon: any;
};

const stepMeta = [
  { id: 1 as Step, title: 'Food\nDetails' },
  { id: 2 as Step, title: 'Collection\nLogistics' },
  { id: 3 as Step, title: 'Confirm\nListing' },
];

const seedItems: FarmItem[] = [
  { name: 'Baked goods', qty: 0, icon: require('../../../assets/placeholder/bread_icon.png') },
  { name: 'Fruit & veg', qty: 0, icon: require('../../../assets/placeholder/fruit&veg_icon.png') },
  { name: 'Grain / cereal', qty: 0, icon: require('../../../assets/placeholder/grain_icon.png') },
  { name: 'Dairy', qty: 0, icon: require('../../../assets/placeholder/milk_icon.png') },
  { name: 'Food scraps – no meat', qty: 0, icon: require('../../../assets/placeholder/food_scraps_icon.png') },
  { name: 'Food scraps – with meat', qty: 0, icon: require('../../../assets/placeholder/meat_icon.png') },
];

const STORAGE_OPTIONS = [
  { label: 'Fridge', icon: require('../../../assets/placeholder/fridge_icon.png'), useImage: true },
  { label: 'Freezer', icon: require('../../../assets/placeholder/freezer_icon.png'), useImage: true },
  { label: 'Ambient', icon: require('../../../assets/placeholder/ambient_temp_icon.png'), useImage: true },
  { label: 'Dry storage', icon: require('../../../assets/placeholder/dry_storage.png'), useImage: true },
  { label: 'Boxed', icon: require('../../../assets/placeholder/storage_box_green.png'), useImage: true },
  { label: 'Bulk Bin', icon: require('../../../assets/placeholder/bin_icon.png'), useImage: true },
  { label: 'Pallet', icon: require('../../../assets/placeholder/pallets_icon.png'), useImage: true },
  { label: 'Other', ionIcon: 'ellipsis-horizontal-outline', useImage: false },
] as const;

const CONTAMINANT_OPTIONS = [
  'Contains Packaging',
  'Contains meat/bone',
  'Contains plastic risk',
  'Mixed materials',
  'Contains Dairy',
  'Other (please specify)',
];

const formatDate = (date: Date | null) => {
  if (!date) return 'Select best before date';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateShort = (date: Date | null) => {
  if (!date) return 'Date';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const formatTime = (date: Date | null) => {
  if (!date) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export function CreateFarmListingScreen({ navigation }: any) {
  const { width: winWidth } = useWindowDimensions();
  const gridLayout = useMemo(() => getGridLayout(winWidth), [winWidth]);

  const { currentProfile, authUser } = useAppContext();
  const { submitting, withLock } = useSubmitLock();
  const { hasPreviousListing, previousListing } = usePreviousListingRelist('animal');
  const businessLogo =
    currentProfile?.logo || authUser?.profile?.organisation?.logoUrl || null;
  const businessInitial =
    currentProfile?.organization?.[0] ||
    authUser?.profile?.organisation?.name?.[0] ||
    'S';

  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<FarmItem[]>(seedItems);
  const [customItem, setCustomItem] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [location, setLocation] = useState(currentProfile?.address || '');
  const [bestBeforeDate, setBestBeforeDate] = useState<Date | null>(null);
  const [pickupFromDate, setPickupFromDate] = useState<Date | null>(null);
  const [pickupToDate, setPickupToDate] = useState<Date | null>(null);

  const [selectedStorage, setSelectedStorage] = useState<string[]>([]);
  const [selectedContaminants, setSelectedContaminants] = useState<string[]>([]);
  const [confirmedSafe, setConfirmedSafe] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>('date');
  const [pickerValue, setPickerValue] = useState(new Date());
  const [stepErrors, setStepErrors] = useState<
    ListingDateFieldErrors & { foodItems?: string; location?: string; confirmedSafe?: string }
  >({});

  const activeItems = useMemo(() => items.filter((item) => item.qty > 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const estimatedMeals = estimateMealsSaved(totalQuantity);
  const estimatedCO2 = estimateCo2AvoidedKg(totalQuantity);

  // ── helpers ──────────────────────────────────────────────────────────────

  const handleBack = () => {
    if (step === 3) { setStep(2); return; }
    if (step === 2) { setStep(1); return; }
    navigation.goBack();
  };

  const handleRelistAgain = () => {
    if (!previousListing) return;

    const values = getFarmRelistFormValues(previousListing, seedItems);
    setItems(values.items);
    setLocation(values.location);
    setBestBeforeDate(values.bestBeforeDate);
    setPickupFromDate(values.pickupFromDate);
    setPickupToDate(values.pickupToDate);
    setSelectedStorage(values.selectedStorage);
    setSelectedContaminants(values.selectedContaminants);
    setImages(values.images);
    setConfirmedSafe(false);
    setStep(1);
  };

  const updateQty = (index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        qty: Math.max(0, Math.round((next[index].qty + delta) * 10) / 10),
      };
      return next;
    });
  };

  const addCustomItem = () => {
    if (!customItem.trim()) return;
    setItems((prev) => [
      ...prev,
      { name: customItem.trim(), qty: 0, icon: require('../../../assets/placeholder/veggie_basket.png') },
    ]);
    setCustomItem('');
  };

  const toggleStorage = (label: string) =>
    setSelectedStorage((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );

  const toggleContaminant = (label: string) =>
    setSelectedContaminants((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );


  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsMultipleSelection: true,
    });
    if (!res.canceled) {
      setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)]);
    }
  };

  const pickFromCamera = async () => {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (!res.canceled) {
      setImages((prev) => [...prev, res.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };


  const openDatePicker = (target: Exclude<PickerTarget, null>) => {
    const initial =
      target === 'bestBefore'
        ? bestBeforeDate || new Date()
        : target === 'from'
          ? pickupFromDate || new Date()
          : pickupToDate || new Date();

    setPickerTarget(target);
    setPickerValue(initial);

    if (Platform.OS === 'ios') {
      setPickerMode(target === 'bestBefore' ? 'date' : 'datetime');
      setPickerVisible(true);
      return;
    }
    setPickerMode('date');
    setPickerVisible(true);
  };

  const applySelectedDate = (target: Exclude<PickerTarget, null>, value: Date) => {
    if (target === 'bestBefore') {
      setBestBeforeDate(value);
      setStepErrors((prev) => ({ ...prev, bestBefore: undefined }));
    }
    if (target === 'from') {
      setPickupFromDate(value);
      setStepErrors((prev) => ({ ...prev, pickupFrom: undefined }));
    }
    if (target === 'to') {
      setPickupToDate(value);
      setStepErrors((prev) => ({ ...prev, pickupTo: undefined }));
    }
  };

  const onNativePickerChange = (event: any, selectedDate?: Date) => {
    if (!pickerTarget) return;
    if (Platform.OS === 'ios') {
      if (selectedDate) setPickerValue(selectedDate);
      return;
    }
    setPickerVisible(false);
    if (event.type === 'dismissed' || !selectedDate) {
      setPickerTarget(null);
      return;
    }
    if (pickerTarget === 'bestBefore') {
      applySelectedDate('bestBefore', selectedDate);
      setPickerTarget(null);
      return;
    }
    if (pickerMode === 'date') {
      const datePart = new Date(selectedDate);
      const timePart =
        pickerTarget === 'from' ? pickupFromDate || new Date() : pickupToDate || new Date();
      datePart.setHours(timePart.getHours());
      datePart.setMinutes(timePart.getMinutes());
      setPickerValue(datePart);
      setPickerMode('time');
      setTimeout(() => setPickerVisible(true), 120);
      return;
    }
    const finalDate = new Date(pickerValue);
    finalDate.setHours(selectedDate.getHours());
    finalDate.setMinutes(selectedDate.getMinutes());
    applySelectedDate(pickerTarget, finalDate);
    setPickerMode('date');
    setPickerTarget(null);
  };

  const confirmIOSPicker = () => {
    if (!pickerTarget) return;
    applySelectedDate(pickerTarget, pickerValue);
    setPickerVisible(false);
    setPickerTarget(null);
    setPickerMode('date');
  };

  const closeIOSPicker = () => {
    setPickerVisible(false);
    setPickerTarget(null);
    setPickerMode('date');
  };

  const handleContinue = () => {
    if (step === 1) {
      const foodError = getListingFoodItemsError(totalQuantity);
      if (foodError) {
        setStepErrors({ foodItems: foodError });
        return;
      }
      setStepErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const dateErrors = getListingDateErrors(bestBeforeDate, pickupFromDate, pickupToDate);
      if (hasListingDateErrors(dateErrors)) {
        setStepErrors(dateErrors);
        return;
      }
      setStepErrors({});
      setStep(3);
    }
  };

  const handleCreateListing = async () => {
    if (submitting) return;

    if (!confirmedSafe) {
      setStepErrors({ confirmedSafe: 'Please confirm this material is for livestock/agricultural use.' });
      return;
    }

    const resolvedSiteId = await resolveListingSiteId(authUser);
    if (!resolvedSiteId) {
      Alert.alert('Site not found', 'Please set up your business site first.');
      return;
    }

    const foodError = getListingFoodItemsError(totalQuantity);
    if (foodError) {
      setStepErrors({ foodItems: foodError });
      setStep(1);
      return;
    }

    const dateErrors = getListingDateErrors(bestBeforeDate, pickupFromDate, pickupToDate);
    if (hasListingDateErrors(dateErrors)) {
      setStepErrors(dateErrors);
      setStep(2);
      return;
    }

    const coords = getSitePickupCoords(authUser);
    if (!coords) {
      setStepErrors({
        location: 'Your site location is not set. Set your farm address on the map from Home.',
      });
      setStep(2);
      return;
    }

    const bestBefore = bestBeforeDate!;
    const pickupFrom = pickupFromDate!;
    const pickupTo = pickupToDate!;

    await withLock(async () => {
      try {
        const payload = {
          siteId: resolvedSiteId,
          listingType: 'ANIMAL' as const,
          foodItems: activeItems.map((item) => ({
            name: item.name,
            category: item.name,
            totalQtyKg: item.qty,
            unit: 'kg',
          })),
          pickupAddress: location || currentProfile?.address || 'Address not provided',
          pickupPostcode: getSitePostcode(authUser),
          pickupLat: coords.lat,
          pickupLng: coords.lng,
          bestBefore: bestBefore.toISOString(),
          pickupFromTime: pickupFrom.toISOString(),
          pickupByTime: pickupTo.toISOString(),
          needsRefrigeration: selectedStorage.includes('Fridge'),
          needsFreezer: selectedStorage.includes('Freezer'),
          needsAmbient:
            selectedStorage.includes('Ambient') ||
            selectedStorage.includes('Dry storage'),
          isSafeForDonation: false,
          allergens: selectedContaminants,
          photoUrls: images.filter((uri) => uri.startsWith('http')),
        };

        await foodListingService.createListing(payload);
        useListingsStore.getState().invalidateSite();
        navigation.replace('RestaurantListings');
      } catch (error: any) {
        console.log('[FoodListing] create failed', error?.response?.status, error?.response?.data);
        Alert.alert(
          'Could not create listing',
          formatApiError(error, 'Please try again.'),
        );
      }
    });
  };

  return (
    <Screen backgroundColor={FARM_BG} scrollable contentStyle={styles.screenContent}>
      <View style={styles.pageWrap}>

        <View style={styles.topPanel}>
          <View style={styles.headerRow}>
            <Pressable onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={normalize(20)} color={FARM_ACCENT} />
            </Pressable>

            <View style={styles.logoCircle}>
              {businessLogo ? (
                <Image source={{ uri: businessLogo }} style={styles.logoImage} resizeMode="cover" />
              ) : (
                <AppText variant="bodyBold" style={styles.logoFallback}>
                  {businessInitial}
                </AppText>
              )}
            </View>
          </View>

          <Image
            source={require('../../../assets/placeholder/livestock.png')}
            style={styles.topIcon}
            resizeMode="contain"
          />

          <AppText variant="h5" color={palette.black} style={styles.topTitle}>
            Surplus for Livestock
          </AppText>
          <AppText variant="body1" color={palette.midgray} style={styles.topSubtitle}>
            List food not suitable for humans to be used as animal feed
          </AppText>

          {/* STEPPER */}
          <View style={styles.stepperRow}>
            {stepMeta.map((entry, index) => {
              const isActive = step === entry.id;
              const isDone = step > entry.id;
              return (
                <React.Fragment key={entry.id}>
                  <Pressable
                    onPress={() => (entry.id <= step ? setStep(entry.id) : undefined)}
                    style={[styles.stepDot, (isActive || isDone) && styles.stepDotActive]}
                  >
                    <AppText
                      variant="bodyBold"
                      color={isActive || isDone ? palette.white : palette.stone}
                      style={styles.stepDotText}
                    >
                      {entry.id}
                    </AppText>
                  </Pressable>

                  {index < stepMeta.length - 1 ? (
                    <View style={[styles.stepLine, step > entry.id && styles.stepLineActive]} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>

          <View style={styles.stepTitlesRow}>
            {stepMeta.map((entry) => (
              <AppText
                key={entry.id}
                variant="bodyBold"
                color={palette.black}
                style={styles.stepLabel}
              >
                {entry.title}
              </AppText>
            ))}
          </View>
        </View>

        {step === 1 ? (
          <View style={styles.stepWrap}>
            {hasPreviousListing ? (
              <View style={styles.relistCard}>
                <AppText variant="bodyBold" color={palette.midgray}>
                  Same as yesterday?
                </AppText>
                <Pressable style={styles.relistBtn} onPress={handleRelistAgain}>
                  <AppText variant="bodyBold" color={palette.white}>
                    YES, LIST AGAIN
                  </AppText>
                  <Ionicons name="arrow-forward" size={normalize(16)} color={palette.white} />
                </Pressable>
              </View>
            ) : null}

            {/* Food items */}
            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              WHAT FOOD DO YOU HAVE?
            </AppText>
            <View style={styles.card}>
              <View style={styles.kgHeaderRow}>
                <View style={styles.foodNameColumn} />
                <AppText variant="body1" color={palette.stone} style={{ marginRight: wp(8) }}>
                  KG
                </AppText>
              </View>

              {items.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.foodRow}>
                  <View style={styles.foodNameWrap}>
                    <Image source={item.icon} style={styles.foodIcon} />
                    <AppText variant="body1" color={palette.midgray} style={styles.foodLabel} numberOfLines={2}>
                      {item.name}
                    </AppText>
                  </View>
                  <View style={styles.qtyWrap}>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(index, -0.5)}>
                      <AppText variant="h6" color={palette.stone}>-</AppText>
                    </Pressable>
                    <AppText variant="bodyBold" color={palette.midgray} style={styles.qtyValue}>
                      {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)}
                    </AppText>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(index, 0.5)}>
                      <AppText variant="h6" color={palette.stone}>+</AppText>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={styles.addRow}>
                <TextInput
                  value={customItem}
                  onChangeText={setCustomItem}
                  placeholder="Add other item..."
                  placeholderTextColor={palette.stone}
                  style={styles.addInput}
                />
                <Pressable style={styles.addBtn} onPress={addCustomItem}>
                  <AppText variant="bodyBold" color={palette.white}>+</AppText>
                </Pressable>
              </View>
            </View>

            {/* Total quantity */}
            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              QUANTITY (KG)
            </AppText>
            <View style={styles.card}>
              <View style={styles.quantityPill}>
                <AppText variant="h2" color={palette.black}>{totalQuantity} KG</AppText>
              </View>
              <AppText variant="caption" color={palette.stone} style={styles.helperText}>
                ESTIMATE TOTAL WEIGHT OF SURPLUS FOOD
              </AppText>
            </View>
            {stepErrors.foodItems ? (
              <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
                {stepErrors.foodItems}
              </AppText>
            ) : null}

            {/* Photos */}
            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              ADD PHOTO (OPTIONAL)
            </AppText>
            <View style={styles.card}>
              {images.length === 0 ? (
                <Pressable style={styles.photoPlaceholder} onPress={pickFromGallery}>
                  <AppText variant="h7" color={palette.stone}>+</AppText>
                </Pressable>
              ) : (
                <View style={styles.photoGrid}>
                  {images.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.previewItem}>
                      <Image source={{ uri }} style={styles.previewImage} />
                      <Pressable style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
                        <Ionicons name="close" size={normalize(14)} color={palette.white} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.photoStatsWrap}>
                <AppText variant="bodySmall" color={palette.stone}>
                  {images.length} photo(s) selected
                </AppText>
              </View>
              <View style={styles.photoButtonRow}>
                <Pressable style={styles.secondaryBtn} onPress={pickFromGallery}>
                  <AppText variant="bodyBold" color={palette.stone}>Gallery</AppText>
                </Pressable>
                <Pressable style={styles.primaryBtn} onPress={pickFromCamera}>
                  <AppText variant="bodyBold" color={palette.white}>Camera</AppText>
                </Pressable>
              </View>
              <AppText variant="caption" color={palette.stone} style={styles.helperText}>
                PHOTOS HELP FARMERS PLAN COLLECTIONS
              </AppText>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stepWrap}>
            {/* Pickup location */}
            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              PICKUP LOCATION
            </AppText>
            <View style={styles.card}>
              <View style={styles.locationBox}>
                <TextInput
                  value={location}
                  onChangeText={(value) => {
                    setLocation(value);
                    setStepErrors((prev) => ({ ...prev, location: undefined }));
                  }}
                  placeholder="Enter pickup address"
                  placeholderTextColor={palette.stone}
                  style={styles.locationInput}
                />
              </View>
            </View>
            {stepErrors.location ? (
              <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
                {stepErrors.location}
              </AppText>
            ) : null}

            {/* Best before */}
            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              FOOD BEST BEFORE
            </AppText>
            <Pressable style={styles.selectorRow} onPress={() => openDatePicker('bestBefore')}>
              <Ionicons name="calendar-outline" size={normalize(20)} color={FARM_ACCENT} />
              <AppText variant="bodyBold" color={palette.midgray}>
                {formatDate(bestBeforeDate)}
              </AppText>
            </Pressable>
            {stepErrors.bestBefore ? (
              <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
                {stepErrors.bestBefore}
              </AppText>
            ) : null}

            {/* Pickup window */}
            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              PICKUP WINDOW
            </AppText>
            <View style={styles.windowRow}>
              <Pressable style={styles.windowBox} onPress={() => openDatePicker('from')}>
                <AppText variant="caption" color={palette.stone}>FROM</AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={styles.windowValue}>
                  {formatDateShort(pickupFromDate)}{'\n'}{formatTime(pickupFromDate)}
                </AppText>
              </Pressable>
              <Pressable style={styles.windowBox} onPress={() => openDatePicker('to')}>
                <AppText variant="caption" color={palette.stone}>TO</AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={styles.windowValue}>
                  {formatDateShort(pickupToDate)}{'\n'}{formatTime(pickupToDate)}
                </AppText>
              </Pressable>
            </View>
            {stepErrors.pickupFrom ? (
              <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
                {stepErrors.pickupFrom}
              </AppText>
            ) : null}
            {stepErrors.pickupTo ? (
              <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
                {stepErrors.pickupTo}
              </AppText>
            ) : null}

            {/* Storage / Handling – multi-select */}
            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              STORAGE / HANDLING
            </AppText>
            <View style={styles.chipGrid}>
              {STORAGE_OPTIONS.map((option, index) => {
                const active = selectedStorage.includes(option.label);
                const showIcon = option.useImage || option.label !== 'Other';
                const isLastInRow = index % STORAGE_COLS === STORAGE_COLS - 1;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => toggleStorage(option.label)}
                    style={[
                      styles.gridChip,
                      styles.storageChip,
                      {
                        width: gridLayout.storageWidth,
                        marginRight: isLastInRow ? 0 : gridLayout.gap,
                        marginBottom: gridLayout.gap,
                        flexShrink: 0,
                      },
                      active && styles.gridChipActive,
                    ]}
                  >
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={normalize(12)}
                        color={FARM_ACCENT}
                        style={styles.gridChipCheck}
                      />
                    ) : null}
                    {showIcon ? (
                      option.useImage ? (
                        <Image
                          source={(option as any).icon}
                          style={styles.storageChipIcon}
                        />
                      ) : (
                        <Ionicons
                          name={(option as any).ionIcon}
                          size={normalize(18)}
                          color={active ? FARM_ACCENT : palette.stone}
                        />
                      )
                    ) : null}
                    <AppText
                      variant="bodySmall"
                      color={active ? FARM_ACCENT : palette.stone}
                      style={styles.storageChipText}
                      numberOfLines={2}
                    >
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Possible contaminants – multi-select */}
            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              POSSIBLE CONTAMINANTS - SELECT ALL THAT APPLY
            </AppText>
            <View style={styles.chipGrid}>
              {CONTAMINANT_OPTIONS.map((label, index) => {
                const active = selectedContaminants.includes(label);
                const isLastInRow = index % CONTAMINANT_COLS === CONTAMINANT_COLS - 1;
                return (
                  <Pressable
                    key={label}
                    onPress={() => toggleContaminant(label)}
                    style={[
                      styles.gridChip,
                      styles.contaminantChip,
                      {
                        width: gridLayout.contaminantWidth,
                        marginRight: isLastInRow ? 0 : gridLayout.gap,
                        marginBottom: gridLayout.gap,
                        flexShrink: 0,
                      },
                      active && styles.gridChipActive,
                    ]}
                  >
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={normalize(12)}
                        color={FARM_ACCENT}
                        style={styles.gridChipCheck}
                      />
                    ) : null}
                    <AppText
                      variant="bodyBold"
                      color={active ? FARM_ACCENT : palette.stone}
                      style={styles.contaminantChipText}
                      numberOfLines={2}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── STEP 3: CONFIRM LISTING ───────────────────────────────────────── */}
        {step === 3 ? (
          <View style={styles.stepWrap}>
            {/* Food summary */}
            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              FOOD SUMMARY
            </AppText>
            <View style={styles.card}>
              <View style={styles.summaryHeadRow}>
                <AppText variant="bodyBold" color={palette.stone}>ITEM NAME</AppText>
                <AppText variant="bodyBold" color={palette.stone}>AVAILABLE</AppText>
              </View>

              {activeItems.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.summaryRow}>
                  <View style={styles.summaryItemNameWrap}>
                    <Image source={item.icon} style={styles.summaryFoodIcon} />
                    <AppText variant="body1" color={palette.midgray} style={styles.summaryItemNameText}>
                      {item.name}
                    </AppText>
                  </View>
                  <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryQtyText}>
                    {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)} kg
                  </AppText>
                </View>
              ))}

              {activeItems.length === 0 ? (
                <AppText variant="body1" color={palette.stone} style={{ textAlign: 'center', marginVertical: hp(1) }}>
                  No items selected
                </AppText>
              ) : null}

              <AppText variant="bodyBold" color={palette.midgray} style={styles.totalQtyText}>
                Total Quantity: {Math.max(totalQuantity, 0)} kg
              </AppText>
            </View>

            {/* Collection summary */}
            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              COLLECTION SUMMARY
            </AppText>
            <View style={styles.card}>
              <View style={styles.summaryInfoRow}>
                <Ionicons name="location-outline" size={normalize(18)} color={FARM_ACCENT} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  {location || 'Address not provided'}
                </AppText>
              </View>

              <View style={styles.summaryInfoRow}>
                <Ionicons name="calendar-outline" size={normalize(18)} color={FARM_ACCENT} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  Best Before - {formatDate(bestBeforeDate)}
                </AppText>
              </View>

              <View style={styles.summaryInfoRow}>
                <Ionicons name="time-outline" size={normalize(18)} color={FARM_ACCENT} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  Pick up - {formatDateShort(pickupFromDate)} {formatTime(pickupFromDate)} to{' '}
                  {formatDateShort(pickupToDate)} {formatTime(pickupToDate)}
                </AppText>
              </View>

              {selectedStorage.length > 0 ? (
                selectedStorage.map((s) => (
                  <View key={s} style={styles.summaryInfoRow}>
                    <Ionicons name="cube-outline" size={normalize(18)} color={FARM_ACCENT} />
                    <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                      {s}
                    </AppText>
                  </View>
                ))
              ) : null}

              {selectedContaminants.length > 0 ? (
                <View style={styles.summaryInfoRow}>
                  <Ionicons name="alert-circle-outline" size={normalize(18)} color={FARM_ACCENT} />
                  <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                    {selectedContaminants.join(', ')}
                  </AppText>
                </View>
              ) : null}
            </View>

            {/* Confirmation checkbox */}
            <Pressable style={styles.confirmWrap} onPress={() => {
              setConfirmedSafe((prev) => !prev);
              setStepErrors((prev) => ({ ...prev, confirmedSafe: undefined }));
            }}>
              <View style={[styles.checkbox, confirmedSafe && styles.checkboxActive]}>
                {confirmedSafe ? (
                  <Ionicons name="checkmark" size={normalize(15)} color={palette.white} />
                ) : null}
              </View>
              <AppText variant="body1" color={palette.midgray} style={styles.confirmText}>
                I confirm this material IS NOT suitable for human consumption and is only appropriate
                for animal livestock feed or agricultural reuse. See{' '}
                <AppText
                  variant="body1"
                  style={styles.termsLink}
                  onPress={() => Linking.openURL('https://www.saveful.com/saveful-for-business-terms-conditions')}
                >
                  Terms & Conditions
                </AppText>
              </AppText>
            </Pressable>
            {stepErrors.confirmedSafe ? (
              <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
                {stepErrors.confirmedSafe}
              </AppText>
            ) : null}

            {/* Impact */}
            <View style={styles.impactCard}>
              <AppText variant="h8" color={palette.middlegreen}>
                Your Impact
              </AppText>
              <View style={styles.impactRow}>
                <View style={styles.impactBlock}>
                  <Ionicons name="restaurant-outline" size={normalize(18)} color={palette.middlegreen} />
                  <View style={styles.impactBlockContent}>
                    <AppText variant="h7" color={palette.middlegreen} style={styles.impactValue}>
                      {Math.max(estimatedMeals, 0)}
                    </AppText>
                    <AppText variant="bodySmall" color={palette.middlegreen} style={styles.impactLabel}>
                      meals saved
                    </AppText>
                  </View>
                </View>

                <View style={styles.impactBlock}>
                  <Image
                    source={require('../../../assets/placeholder/co2_green_icon.png')}
                    style={styles.impactIcon}
                  />
                  <View style={styles.impactBlockContent}>
                    <AppText variant="h7" color={palette.middlegreen} style={styles.impactValue}>
                      {formatCo2AvoidedKg(totalQuantity)}kg
                    </AppText>
                    <AppText variant="bodySmall" color={palette.middlegreen} style={styles.impactLabel}>
                      CO2 avoided
                    </AppText>
                  </View>
                </View>
              </View>
              <AppText variant="bodySmall" color={palette.middlegreen} style={styles.impactFootnote}>
                420g = 1 meal · CO₂ = food kg × 2.1
              </AppText>
            </View>
          </View>
        ) : null}

        {/* BOTTOM BUTTON */}
        <Pressable
          style={[styles.bottomButton, submitting && styles.bottomButtonDisabled]}
          onPress={step === 3 ? handleCreateListing : handleContinue}
          disabled={submitting}
        >
          <AppText variant="bodyBold" color={palette.white}>
            {step === 3 ? (submitting ? 'CREATING...' : 'CREATE FARM LISTING') : 'CONTINUE'}
          </AppText>
          {!submitting ? (
            <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
          ) : null}
        </Pressable>
      </View>

      {/* iOS date picker modal */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={closeIOSPicker}
        >
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerCard}>
              <View style={styles.iosPickerActions}>
                <Pressable onPress={closeIOSPicker}>
                  <AppText variant="bodyBold" color={palette.stone}>Cancel</AppText>
                </Pressable>
                <Pressable onPress={confirmIOSPicker}>
                  <AppText variant="bodyBold" color={FARM_ACCENT}>Done</AppText>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode={pickerMode === 'datetime' ? 'datetime' : 'date'}
                display="spinner"
                onChange={onNativePickerChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Android date picker */}
      {Platform.OS === 'android' && pickerVisible ? (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode === 'datetime' ? 'date' : pickerMode}
          display="default"
          onChange={onNativePickerChange}
          minimumDate={new Date()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingBottom: hp(2.2),
    backgroundColor: FARM_BG,
  },
  pageWrap: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: normalize(560),
    paddingHorizontal: wp(4.4),
    paddingTop: hp(1),
  },
  topPanel: {
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.3),
  },
  backBtn: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    borderWidth: normalize(1.5),
    borderColor: '#F0C89A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    borderWidth: normalize(1.5),
    borderColor: '#F0C89A',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    color: FARM_ACCENT,
    textTransform: 'uppercase',
  },
  topIcon: {
    width: wp(30),
    height: hp(12),
    marginTop: -hp(2),
    marginBottom: -hp(1.5),
  },
  topTitle: {
    textAlign: 'center',
    textTransform: 'none',
  },
  topSubtitle: {
    marginTop: hp(0.2),
    textAlign: 'center',
  },
  stepperRow: {
    marginTop: hp(1.1),
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: wp(7.2),
    height: wp(7.2),
    borderRadius: wp(3.6),
    borderWidth: normalize(2),
    borderColor: '#8D8D8D',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: FARM_ACCENT,
    borderColor: FARM_ACCENT,
  },
  stepDotText: {
    fontSize: normalize(12),
    lineHeight: normalize(13),
  },
  stepLine: {
    width: wp(23.2),
    height: normalize(3),
    borderRadius: normalize(2),
    backgroundColor: '#8D8D8D',
  },
  stepLineActive: {
    backgroundColor: FARM_ACCENT,
  },
  stepTitlesRow: {
    marginTop: hp(0.5),
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  stepLabel: {
    textAlign: 'center',
    width: '32%',
    fontSize: normalize(12),
    lineHeight: normalize(13),
  },
  stepWrap: {
    marginTop: hp(1.2),
    gap: hp(0.9),
  },
  sectionTitle: {
    marginTop: hp(0.2),
  },
  fieldLabel: {
    marginTop: hp(0.4),
    textTransform: 'none',
  },
  fieldSubLabel: {
    marginTop: -hp(0.4),
  },
  card: {
    borderWidth: normalize(1),
    borderColor: FARM_ACCENT,
    borderRadius: normalize(14),
    backgroundColor: palette.surface,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    gap: hp(0.8),
  },
  relistCard: {
    borderWidth: normalize(1),
    borderColor: FARM_ACCENT,
    backgroundColor: palette.surface,
    borderRadius: normalize(12),
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    gap: hp(0.8),
  },
  relistBtn: {
    width: '100%',
    minHeight: hp(4.4),
    borderRadius: normalize(8),
    backgroundColor: FARM_ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
  },
  kgHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodNameColumn: {
    flex: 1,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foodNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  foodIcon: {
    width: normalize(22),
    height: normalize(22),
    flexShrink: 0,
  },
  foodLabel: {
    flex: 1,
    flexShrink: 1,
    marginLeft: wp(2),
    textTransform: 'none',
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
    flexShrink: 0,
    marginLeft: wp(1.5),
  },
  qtyBtn: {
    width: wp(12),
    height: wp(12),
    borderRadius: normalize(12),
    backgroundColor: '#F9E0C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: wp(5),
    textAlign: 'center',
  },
  addRow: {
    marginTop: hp(0.4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  addInput: {
    flex: 1,
    borderWidth: normalize(1.5),
    borderColor: '#D9BFA0',
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    minHeight: hp(4.4),
    paddingHorizontal: wp(3),
    color: palette.midgray,
    fontSize: normalize(14),
    fontFamily: 'Saveful-Regular',
  },
  addBtn: {
    width: wp(8),
    height: wp(8),
    borderRadius: normalize(7),
    backgroundColor: FARM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityPill: {
    borderRadius: normalize(12),
    minHeight: hp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    textAlign: 'left',
  },
  inlineError: {
    marginTop: hp(0.2),
  },
  photoPlaceholder: {
    width: wp(16),
    height: wp(16),
    borderRadius: normalize(10),
    borderWidth: normalize(1.5),
    borderStyle: 'dashed',
    borderColor: '#D9BFA0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
  },
  previewItem: {
    width: wp(20),
    height: wp(20),
    borderRadius: normalize(10),
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    right: wp(1),
    top: wp(1),
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  photoStatsWrap: {
    flex: 1,
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  secondaryBtn: {
    flex: 1,
    minHeight: hp(4.3),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: '#C9C9C9',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    minHeight: hp(4.3),
    borderRadius: normalize(10),
    backgroundColor: FARM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBox: {
    borderRadius: normalize(12),
    borderWidth: normalize(1),
    borderColor: '#D9D9D9',
    backgroundColor: palette.white,
    minHeight: hp(6),
    justifyContent: 'center',
  },
  locationInput: {
    paddingHorizontal: wp(3),
    color: palette.midgray,
    fontSize: normalize(14),
    fontFamily: 'Saveful-Regular',
  },
  selectorRow: {
    minHeight: hp(5.2),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: FARM_ACCENT,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.2),
    paddingHorizontal: wp(3),
  },
  windowRow: {
    flexDirection: 'row',
    gap: wp(3),
  },
  windowBox: {
    flex: 1,
    minHeight: hp(6.8),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: FARM_ACCENT,
    backgroundColor: palette.surface,
    paddingHorizontal: wp(3),
    justifyContent: 'center',
  },
  windowValue: {
    marginTop: hp(0.3),
    textTransform: 'none',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridChip: {
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: '#F0C89A',
    backgroundColor: '#FFFAF4',
    position: 'relative',
  },
  storageChip: {
    minHeight: hp(7),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(0.8),
    paddingVertical: hp(0.7),
    gap: hp(0.4),
  },
  storageChipIcon: {
    width: normalize(24),
    height: normalize(24),
  },
  storageChipText: {
    textAlign: 'center',
    textTransform: 'none',
  },
  contaminantChip: {
    minHeight: hp(7.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.2),
    paddingVertical: hp(0.8),
  },
  contaminantChipText: {
    textAlign: 'center',
  },
  gridChipCheck: {
    position: 'absolute',
    top: hp(0.35),
    right: wp(0.6),
    zIndex: 1,
  },
  gridChipActive: {
    borderColor: FARM_ACCENT,
    backgroundColor: '#FFF0D9',
  },
  summaryHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: normalize(2),
    borderBottomColor: '#F0C89A',
    paddingBottom: hp(1),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(0.6),
  },
  summaryItemNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
    flex: 1,
    minWidth: 0,
  },
  summaryItemNameText: {
    flexShrink: 1,
    textTransform: 'none',
  },
  summaryFoodIcon: {
    width: normalize(18),
    height: normalize(18),
    flexShrink: 0,
  },
  summaryQtyText: {
    marginLeft: wp(2),
    minWidth: wp(16),
    textAlign: 'right',
    flexShrink: 0,
  },
  totalQtyText: {
    marginTop: hp(0.6),
  },
  summaryInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.2),
  },
  summaryInfoText: {
    flex: 1,
    textTransform: 'none',
  },
  confirmWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: normalize(1),
    borderColor: FARM_ACCENT,
    borderRadius: normalize(12),
    backgroundColor: palette.surface,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: wp(2.5),
  },
  checkbox: {
    marginTop: hp(0.1),
    width: wp(6.3),
    height: wp(6.3),
    borderRadius: normalize(6),
    borderWidth: normalize(1),
    borderColor: FARM_ACCENT,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: FARM_ACCENT,
  },
  confirmText: {
    flex: 1,
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  impactCard: {
    borderWidth: normalize(1.5),
    borderColor: palette.middlegreen,
    borderRadius: normalize(14),
    backgroundColor: palette.surface,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    gap: hp(0.8),
  },
  impactRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  impactBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
  },
  impactIcon: {
  width: normalize(36),
  height: normalize(36),
  resizeMode: 'contain',
  marginRight: wp(2), 
},
  impactBlockContent: {
    flex: 1,
    minWidth: 0,
  },
  impactValue: {
    flexShrink: 0,
  },
  impactLabel: {
    flexShrink: 1,
    lineHeight: normalize(14),
  },
  impactFootnote: {
    marginTop: hp(0.8),
    textAlign: 'center',
    textTransform: 'none',
  },

  bottomButton: {
    marginTop: hp(1.6),
    minHeight: hp(5.2),
    borderRadius: normalize(10),
    backgroundColor: FARM_ACCENT,
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
  },
  bottomButtonDisabled: {
    opacity: 0.65,
  },

  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  iosPickerCard: {
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(14),
    borderTopRightRadius: normalize(14),
    paddingBottom: hp(1),
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  termsLink: {
    color: palette.primary,
    textDecorationLine: 'underline',
  },
});
