import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { usePreviousListingRelist } from '@/hooks/usePreviousListingRelist';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { connectionsService } from '@/services/connections.service';
import { foodListingService } from '@/services/foodListing.service';
import { getPeopleRelistFormValues } from '@/utils/listingRelist';
import { showConfirmAlert } from '@/store/appAlertStore';
import { useListingsStore } from '@/store/listingsStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import {
  estimateMealsSaved,
  formatCo2AvoidedKg,
  resolveFoodIconSource,
  type FoodIconKey,
} from '@/utils/foodListing';
import { takePhoto } from '@/utils/pickSquareImage';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildFormShellStyles } from '@/utils/dashboardAdaptive';

type FoodItem = { name: string; qty: number; iconKey: FoodIconKey };
type Storage = 'Fridge' | 'Freezer' | 'Ambient' | 'Hot';
type Reheating = 'Yes' | 'No' | 'Not sure';

const seedItems: FoodItem[] = [
  { name: 'Prepared meals', qty: 0, iconKey: 'preparedMeals' },
  { name: 'Bread', qty: 0, iconKey: 'bread' },
  { name: 'Baked Goods', qty: 0, iconKey: 'bakedGoods' },
  { name: 'Fresh fruit & veg', qty: 0, iconKey: 'fruitVeg' },
  { name: 'Meat', qty: 0, iconKey: 'meat' },
  { name: 'Dairy', qty: 0, iconKey: 'dairy' },
  { name: 'Sandwiches', qty: 0, iconKey: 'sandwiches' },
  { name: 'Salads', qty: 0, iconKey: 'salads' },
];

const ALLERGEN_OPTIONS = [
  'Gluten',
  'Dairy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Peanuts',
  'Tree nuts',
  'Soy',
  'Sesame',
  'Mustard',
  'Celery',
  'Lupin',
  'Molluscs',
  'Sulphites',
];

const storageOptions: ReadonlyArray<{ label: Storage; icon: any }> = [
  { label: 'Fridge', icon: require('../../../assets/placeholder/fridge_icon.png') },
  { label: 'Freezer', icon: require('../../../assets/placeholder/freezer_icon.png') },
  { label: 'Ambient', icon: require('../../../assets/placeholder/ambient_temp_icon.png') },
  { label: 'Hot', icon: require('../../../assets/placeholder/heating_icon.png') },
];

const reheatingOptions: ReadonlyArray<{ label: Reheating; icon?: any }> = [
  { label: 'Yes', icon: require('../../../assets/placeholder/heating_icon.png') },
  { label: 'No', icon: require('../../../assets/placeholder/no_heating_icon.png') },
  { label: 'Not sure' },
];

export function AddDailySurplusScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildFormShellStyles(r), [r]);
  const { submitting, withLock } = useSubmitLock();
  const { hasPreviousListing, previousListing } = usePreviousListingRelist('people');

  const dayId = Number(route?.params?.dayId);
  const charityName = String(route?.params?.charityName || 'Preferred charity');

  const [items, setItems] = useState<FoodItem[]>(seedItems);
  const [customItem, setCustomItem] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [reheating, setReheating] = useState<Reheating | null>(null);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [collectionNotes, setCollectionNotes] = useState('');
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [relistApplied, setRelistApplied] = useState(false);
  const [errors, setErrors] = useState<{
    foodItems?: string;
    storage?: string;
    reheating?: string;
    confirmedSafe?: string;
  }>({});

  const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);
  const estimatedMeals = estimateMealsSaved(totalQuantity);
  const hasSelectedAllergens = selectedAllergens.length > 0;

  const updateQty = (index: number, delta: number) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, qty: Math.max(0, Math.round((item.qty + delta) * 10) / 10) } : item,
      ),
    );
    setErrors((prev) => ({ ...prev, foodItems: undefined }));
  };

  const addCustomItem = () => {
    const name = customItem.trim();
    if (!name) return;
    setItems((current) =>
      current.some((item) => item.name.toLowerCase() === name.toLowerCase())
        ? current
        : [...current, { name, qty: 0, iconKey: 'preparedMeals' }],
    );
    setCustomItem('');
  };

  const useLastCollection = () => {
    if (!previousListing) return;
    const values = getPeopleRelistFormValues(previousListing, seedItems);
    setItems(values.items);
    setStorage(values.storage);
    setReheating(values.reheating);
    setSelectedAllergens(values.selectedAllergens);
    setCollectionNotes(values.collectionNotes);
    setImages(values.images);
    setConfirmedSafe(false);
    setRelistApplied(true);
    setErrors((prev) => ({
      ...prev,
      foodItems: undefined,
      storage: undefined,
      reheating: undefined,
    }));
  };

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((entry) => entry !== allergen) : [...prev, allergen],
    );
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!res.canceled) {
      setImages((prev) => [...prev, ...res.assets.map((item) => item.uri)].slice(0, 5));
    }
  };

  const pickFromCamera = async () => {
    const uri = await takePhoto(1);
    if (uri) setImages((prev) => [...prev, uri].slice(0, 5));
  };

  const publish = () =>
    withLock(async () => {
      const nextErrors: typeof errors = {};
      if (totalQuantity <= 0) nextErrors.foodItems = 'Add a quantity for at least one food.';
      if (!storage) nextErrors.storage = 'Please select a storage requirement.';
      if (!reheating) nextErrors.reheating = 'Please select whether reheating is required.';
      if (!confirmedSafe) nextErrors.confirmedSafe = 'Please confirm this food is safe to donate.';
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return;
      }
      if (!Number.isFinite(dayId)) {
        showErrorAlert("Today's collection isn't ready yet. Try again in a moment.");
        return;
      }

      try {
        const photoUrls = images.length ? await foodListingService.uploadPhotos(images) : [];
        const result = await connectionsService.addDailySurplus(dayId, {
          items: items
            .filter((item) => item.qty > 0)
            .map((item) => ({
              name: item.name,
              quantityKg: item.qty,
              category: item.name,
            })),
          collectionNotes: collectionNotes.trim() || undefined,
          needsRefrigeration: storage === 'Fridge',
          needsFreezer: storage === 'Freezer',
          needsAmbient: storage === 'Ambient',
          needsHot: storage === 'Hot',
          needsReheating: reheating === 'Yes',
          isSafeForDonation: true,
          allergens: selectedAllergens,
          photoUrls,
        });
        useListingsStore.getState().invalidateSite();
        showSuccessAlert(
          result.message || "Today’s collection is ready. Only the preferred charity can see it.",
        );
        navigation.goBack();
      } catch (error) {
        showErrorAlert(error, 'Could not publish today’s surplus');
      }
    });

  const noSurplus = () =>
    showConfirmAlert({
      title: 'No surplus today?',
      message: `Today’s collection will be cancelled and ${charityName} will be notified. Your regular Connection will continue as usual.`,
      confirmLabel: 'Confirm no surplus today',
      cancelLabel: 'Go back',
      onConfirm: () =>
        withLock(async () => {
          try {
            const result = await connectionsService.declareNoSurplus(dayId);
            showSuccessAlert(result.message || 'The charity has been told.');
            navigation.goBack();
          } catch (error) {
            showErrorAlert(error, 'Could not update today’s collection');
          }
        }),
    });

  return (
    <Screen
      backgroundColor="#F2F5E9"
      scrollable
      keyboardAware
      contentStyle={{ ...styles.screenContent, ...adaptive.screenContent }}
    >
      <View style={[styles.pageWrap, adaptive.pageWrap]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={normalize(20)} color={palette.kale} />
          </Pressable>
          <AppText variant="h6" color={palette.black} style={styles.headerTitle} numberOfLines={1}>
            Today’s surplus
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        {hasPreviousListing && !relistApplied ? (
          <View style={styles.relistCard}>
            <AppText variant="bodyBold" color={palette.midgray}>
              Same as last time?
            </AppText>
            <AppText variant="caption" color={palette.stone} style={styles.relistCopy}>
              Use last collection, then check the quantities are still correct.
            </AppText>
            <Pressable style={styles.relistBtn} onPress={useLastCollection}>
              <AppText variant="bodyBold" color={palette.white}>
                Use last collection
              </AppText>
              <Ionicons name="arrow-forward" size={normalize(16)} color={palette.white} />
            </Pressable>
          </View>
        ) : null}

        {relistApplied ? (
          <View style={styles.relistCard}>
            <AppText variant="bodyBold" color={palette.middlegreen} style={styles.relistHint}>
              Copied from last collection. Please check the quantities are correct before you list.
            </AppText>
          </View>
        ) : null}

        <View style={styles.stepWrap}>
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
                  <Image source={resolveFoodIconSource(item.iconKey)} style={styles.foodIcon} />
                  <AppText variant="body1" color={palette.midgray} style={styles.foodLabel}>
                    {item.name}
                  </AppText>
                </View>
                <View style={styles.qtyWrap}>
                  <Pressable style={[styles.qtyBtn, adaptive.qtyBtn]} onPress={() => updateQty(index, -0.5)}>
                    <AppText variant="h6" color={palette.stone}>-</AppText>
                  </Pressable>
                  <AppText variant="bodyBold" color={palette.midgray} style={styles.qtyValue}>
                    {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)}
                  </AppText>
                  <Pressable style={[styles.qtyBtn, adaptive.qtyBtn]} onPress={() => updateQty(index, 0.5)}>
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

          <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
            QUANTITY (KG)
          </AppText>
          <View style={styles.card}>
            <View style={styles.quantityPill}>
              <AppText variant="h2" color={palette.black}>
                {totalQuantity % 1 === 0 ? totalQuantity.toFixed(0) : totalQuantity.toFixed(1)} KG
              </AppText>
            </View>
            <AppText variant="caption" color={palette.stone} style={styles.helperText}>
              ESTIMATE TOTAL WEIGHT OF SURPLUS FOOD
            </AppText>
          </View>
          {errors.foodItems ? (
            <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
              {errors.foodItems}
            </AppText>
          ) : null}

          <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
            ADD PHOTO (OPTIONAL)
          </AppText>
          <View style={styles.card}>
            {images.length === 0 ? (
              <Pressable style={[styles.photoPlaceholder, adaptive.photoPlaceholder]} onPress={pickFromGallery}>
                <AppText variant="h7" color={palette.stone}>+</AppText>
              </Pressable>
            ) : (
              <View style={styles.photoGrid}>
                {images.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={[styles.previewItem, adaptive.previewItem]}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <Pressable
                      style={styles.removePhotoBtn}
                      onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    >
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
              <Pressable style={[styles.secondaryBtn, adaptive.secondaryBtn]} onPress={pickFromGallery}>
                <AppText variant="bodyBold" color={palette.stone}>Gallery</AppText>
              </Pressable>
              <Pressable style={[styles.primaryBtn, adaptive.primaryBtn]} onPress={pickFromCamera}>
                <AppText variant="bodyBold" color={palette.white}>Camera</AppText>
              </Pressable>
            </View>
            <AppText variant="caption" color={palette.stone} style={styles.helperText}>
              PHOTOS HELP CHARITIES PLAN COLLECTIONS
            </AppText>
          </View>

          <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
            COLLECTION NOTES (OPTIONAL)
          </AppText>
          <AppText variant="caption" color={palette.stone} style={styles.notesHint}>
            Add anything the collector should know about this pickup.
          </AppText>
          <View style={styles.notesCard}>
            <TextInput
              value={collectionNotes}
              onChangeText={(value) => setCollectionNotes(value.slice(0, 300))}
              placeholder="e.g. Enter via the loading dock, ask for the kitchen manager or bring crates."
              placeholderTextColor={palette.stone}
              style={styles.notesInput}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />
            <AppText variant="caption" color={palette.stone} style={styles.notesCount}>
              {collectionNotes.length}/300
            </AppText>
          </View>

          <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
            STORAGE REQUIREMENTS
          </AppText>
          <View style={styles.chipRow}>
            {storageOptions.map((option) => {
              const active = storage === option.label;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    setStorage(option.label);
                    setErrors((prev) => ({ ...prev, storage: undefined }));
                  }}
                  style={[
                    styles.choiceChip,
                    adaptive.choiceChip,
                    styles.storageChoiceChip,
                    active && styles.choiceChipActive,
                  ]}
                >
                  <Image source={option.icon} style={{ width: normalize(16), height: normalize(16) }} />
                  <AppText
                    variant="bodyBold"
                    color={active ? palette.middlegreen : palette.black}
                    style={styles.storageChoiceText}
                  >
                    {option.label}
                  </AppText>
                  {active ? (
                    <Ionicons name="checkmark" size={normalize(14)} color={palette.middlegreen} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {errors.storage ? (
            <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
              {errors.storage}
            </AppText>
          ) : null}

          <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
            REHEATING REQUIRED?
          </AppText>
          <View style={styles.chipRow}>
            {reheatingOptions.map((option) => {
              const active = reheating === option.label;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    setReheating(option.label);
                    setErrors((prev) => ({ ...prev, reheating: undefined }));
                  }}
                  style={[styles.choiceChip, adaptive.choiceChip, active && styles.choiceChipActive]}
                >
                  {option.icon ? (
                    <Image source={option.icon} style={{ width: normalize(18), height: normalize(18) }} />
                  ) : (
                    <Ionicons
                      name="help-circle-outline"
                      size={normalize(18)}
                      color={active ? palette.kale : palette.stone}
                    />
                  )}
                  <AppText variant="bodyBold" color={active ? palette.kale : palette.stone}>
                    {option.label}
                  </AppText>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={normalize(15)} color={palette.kale} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {errors.reheating ? (
            <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
              {errors.reheating}
            </AppText>
          ) : null}

          <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
            ALLERGENS (OPTIONAL)
          </AppText>
          <View style={styles.allergenCard}>
            <View style={styles.allergenActionsRow}>
              <Pressable style={styles.allergenActionBtn} onPress={() => setSelectedAllergens([...ALLERGEN_OPTIONS])}>
                <AppText variant="bodyBold" color={palette.kale}>Select all</AppText>
              </Pressable>
              <Pressable style={styles.allergenActionBtn} onPress={() => setSelectedAllergens([])}>
                <AppText variant="bodyBold" color={palette.stone}>Clear</AppText>
              </Pressable>
            </View>
            <View style={styles.allergenChipWrap}>
              {ALLERGEN_OPTIONS.map((allergen) => {
                const active = selectedAllergens.includes(allergen);
                return (
                  <Pressable
                    key={allergen}
                    onPress={() => toggleAllergen(allergen)}
                    style={[styles.allergenChip, active && styles.allergenChipActive]}
                  >
                    <AppText variant="bodySmall" color={active ? palette.kale : palette.stone}>
                      {allergen}
                    </AppText>
                    {active ? <Ionicons name="checkmark-circle" size={normalize(14)} color={palette.kale} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.allergenSummaryRow}>
              <Image
                source={require('../../../assets/placeholder/allergen_icon.png')}
                style={styles.allergenSummaryIcon}
              />
              <AppText variant="bodyBold" color={palette.midgray} style={styles.allergenSummaryText}>
                {hasSelectedAllergens ? selectedAllergens.join(', ') : 'No allergens selected'}
              </AppText>
            </View>
          </View>

          <Pressable
            style={styles.confirmWrap}
            onPress={() => {
              setConfirmedSafe((value) => !value);
              setErrors((prev) => ({ ...prev, confirmedSafe: undefined }));
            }}
          >
            <View style={[styles.checkbox, confirmedSafe && styles.checkboxActive]}>
              {confirmedSafe ? <Ionicons name="checkmark" size={normalize(15)} color={palette.white} /> : null}
            </View>
            <AppText variant="body1" color={palette.midgray} style={styles.confirmText}>
              I confirm this food is safe for human consumption and suitable for charity donation.
            </AppText>
          </Pressable>
          {errors.confirmedSafe ? (
            <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
              {errors.confirmedSafe}
            </AppText>
          ) : null}

          <View style={styles.impactCard}>
            <AppText variant="h8" color={palette.success}>Your Impact</AppText>
            <View style={styles.impactRow}>
              <View style={styles.impactBlock}>
                <Ionicons name="restaurant-outline" size={normalize(18)} color={palette.success} />
                <AppText variant="h7" color={palette.success}>{Math.max(estimatedMeals, 0)}</AppText>
                <AppText variant="bodySmall" color={palette.success}>meals saved</AppText>
              </View>
              <View style={styles.impactBlock}>
                <Ionicons name="leaf-outline" size={normalize(18)} color={palette.success} />
                <AppText variant="h7" color={palette.success}>{formatCo2AvoidedKg(totalQuantity)}kg</AppText>
                <AppText variant="bodySmall" color={palette.success}>CO2 avoided</AppText>
              </View>
            </View>
            <AppText variant="bodySmall" color={palette.success}>420g = 1 meal</AppText>
          </View>
        </View>

        <Pressable
          style={[styles.bottomButton, adaptive.bottomButton, submitting && styles.bottomButtonDisabled]}
          onPress={publish}
          disabled={submitting}
        >
          <AppText variant="bodyBold" color={palette.white}>
            {submitting ? 'PUBLISHING...' : `PUBLISH TO ${charityName.toUpperCase()}`}
          </AppText>
          {!submitting ? (
            <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
          ) : null}
        </Pressable>

        <Pressable style={styles.nothingBtn} onPress={noSurplus} disabled={submitting}>
          <AppText variant="bodyBold" color={palette.primary}>Nothing today</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingBottom: hp(2.2),
    backgroundColor: '#F2F5E9',
  },
  pageWrap: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: normalize(560),
    paddingHorizontal: wp(4.2),
    paddingTop: hp(1.2),
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.3),
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'none',
  },
  headerSpacer: {
    width: normalize(34),
  },
  backBtn: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    borderWidth: normalize(1.5),
    borderColor: '#B8C6B1',
    backgroundColor: '#F8FBF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relistCard: {
    borderWidth: normalize(2),
    borderColor: palette.kale,
    backgroundColor: '#F0F5E8',
    borderRadius: normalize(12),
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    gap: hp(0.8),
    marginTop: hp(1.2),
  },
  relistCopy: {
    textAlign: 'center',
    textTransform: 'none',
    lineHeight: normalize(18),
  },
  relistBtn: {
    width: '100%',
    minHeight: hp(4.4),
    borderRadius: normalize(8),
    backgroundColor: palette.kale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
  },
  relistHint: {
    textAlign: 'center',
    textTransform: 'none',
    lineHeight: normalize(20),
    paddingVertical: hp(0.6),
  },
  stepWrap: { marginTop: hp(1.2), gap: hp(0.9) },
  sectionTitle: { marginTop: hp(0.2) },
  card: {
    borderWidth: normalize(2),
    borderColor: '#D9D9D9',
    borderRadius: normalize(14),
    backgroundColor: '#F8F8F6',
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    gap: hp(0.8),
  },
  kgHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  foodNameColumn: { flex: 1 },
  foodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  foodNameWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  foodLabel: { marginLeft: wp(2), textTransform: 'none' },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: wp(1.8) },
  foodIcon: { width: normalize(22), height: normalize(22) },
  qtyBtn: {
    width: wp(12),
    height: wp(12),
    borderRadius: normalize(12),
    backgroundColor: '#E6E2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { minWidth: wp(5), textAlign: 'center' },
  addRow: { marginTop: hp(0.4), flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  addInput: {
    flex: 1,
    borderWidth: normalize(1.5),
    borderColor: '#9FA7A0',
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
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityPill: {
    borderRadius: normalize(12),
    minHeight: hp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: { textAlign: 'left' },
  inlineError: { marginTop: hp(0.2) },
  photoPlaceholder: {
    width: wp(16),
    height: wp(16),
    borderRadius: normalize(10),
    borderWidth: normalize(1.5),
    borderStyle: 'dashed',
    borderColor: '#9FA7A0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2.5) },
  previewItem: {
    width: wp(20),
    height: wp(20),
    borderRadius: normalize(10),
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: { width: '100%', height: '100%' },
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
  photoStatsWrap: { flex: 1 },
  photoButtonRow: { flexDirection: 'row', gap: wp(2.5) },
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
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { marginTop: hp(0.5), textTransform: 'none' },
  notesHint: { marginTop: hp(0.4) },
  notesCard: {
    borderRadius: normalize(12),
    borderWidth: normalize(1),
    borderColor: '#D9D9D9',
    backgroundColor: palette.white,
    paddingHorizontal: wp(3),
    paddingTop: hp(1),
    paddingBottom: hp(0.8),
    minHeight: hp(12),
  },
  notesInput: {
    minHeight: hp(8),
    color: palette.midgray,
    fontSize: normalize(14),
    fontFamily: 'Saveful-Regular',
    lineHeight: normalize(20),
  },
  notesCount: { alignSelf: 'flex-end', marginTop: hp(0.4) },
  chipRow: { flexDirection: 'row', gap: wp(1.6) },
  storageChoiceChip: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: wp(0.6),
    paddingVertical: hp(0.6),
    gap: hp(0.15),
  },
  storageChoiceText: { fontSize: normalize(11), textAlign: 'center' },
  allergenCard: {
    borderWidth: normalize(1),
    borderColor: '#DADCD0',
    borderRadius: normalize(12),
    backgroundColor: palette.white,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: hp(0.8),
  },
  allergenActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: wp(2) },
  allergenActionBtn: {
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2.5),
    borderRadius: normalize(999),
    backgroundColor: '#F4F4EE',
  },
  allergenChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2) },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.4),
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.6),
    borderRadius: normalize(999),
    backgroundColor: '#F4F4EE',
    borderWidth: normalize(1),
    borderColor: '#C7CDBF',
  },
  allergenChipActive: { borderColor: '#8CBD97', backgroundColor: '#ECF5E9' },
  allergenSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  allergenSummaryIcon: { width: normalize(20), height: normalize(20) },
  allergenSummaryText: { flex: 1, textTransform: 'none' },
  choiceChip: {
    flex: 1,
    minHeight: hp(6.2),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: '#C7CDBF',
    backgroundColor: '#F4F4EE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(0.3),
  },
  choiceChipActive: { borderColor: '#8CBD97', backgroundColor: '#ECF5E9' },
  confirmWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: normalize(1.5),
    borderColor: '#B2C4A9',
    borderRadius: normalize(12),
    backgroundColor: '#F3F5EE',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: wp(2.5),
  },
  checkbox: {
    marginTop: hp(0.1),
    width: wp(6.3),
    height: wp(6.3),
    borderRadius: normalize(6),
    borderWidth: normalize(2),
    borderColor: '#6B8C66',
    backgroundColor: '#F3F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: palette.kale },
  confirmText: { flex: 1, lineHeight: normalize(18), textTransform: 'none' },
  impactCard: {
    borderWidth: normalize(1.5),
    borderColor: '#C1D5BF',
    borderRadius: normalize(14),
    backgroundColor: '#E9F4E5',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    gap: hp(0.8),
  },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between', gap: wp(4) },
  impactBlock: { flexDirection: 'row', alignItems: 'center', gap: wp(1.4) },
  bottomButton: {
    marginTop: hp(1.6),
    minHeight: hp(5.2),
    borderRadius: normalize(10),
    backgroundColor: palette.kale,
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
  },
  bottomButtonDisabled: { opacity: 0.65 },
  nothingBtn: {
    minHeight: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
