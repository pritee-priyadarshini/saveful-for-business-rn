import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { palette } from '../../theme/colors';
import {
  fetchListingDetail,
  foodListingService,
  invalidateListingDetail,
  type ListingDetail,
} from '../../services/foodListing.service';
import { estimateMealsSaved, estimateCo2AvoidedKg, formatCo2AvoidedKg, resolveFoodIconSource, type FoodIconKey } from '../../utils/foodListing';
import {
  extractListingImages,
  getListingPickupAddress,
  getListingPickupFrom,
  getListingPickupTo,
  inferContaminants,
  inferFarmStorage,
  inferPeopleAllergens,
  inferPeopleStorage,
  inferReheating,
  isAnimalListing,
  mergeFarmFoodItems,
  mergePeopleFoodItems,
  parseListingDate,
} from '../../utils/listingFormPrefill';
import { useSubmitLock } from '../../hooks/useSubmitLock';
import { useListingsStore } from '../../store/listingsStore';
import { showErrorAlert } from '../../utils/apiError';


const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type Step = 1 | 2 | 3;
type PickerTarget = 'bestBefore' | 'from' | 'to' | null;

type FoodItem = {
  name: string;
  qty: number;
  iconKey: FoodIconKey;
};

const stepMeta = [
  { id: 1 as Step, title: 'Food\nDetails' },
  { id: 2 as Step, title: 'Collection\nLogistics' },
  { id: 3 as Step, title: 'Confirm\nListing' },
];

const seedItems: FoodItem[] = [
  { name: 'Prepared meals', qty: 0, iconKey: 'preparedMeals' },
  { name: 'Bread', qty: 0, iconKey: 'bread' },
  { name: 'Baked Goods', qty: 0, iconKey: 'bakedGoods' },
  { name: 'Fresh fruit & veg', qty: 0, iconKey: 'fruitVeg' },
  { name: 'Meat', qty: 0, iconKey: 'meat' },
  { name: 'Dairy', qty: 0, iconKey: 'dairy' },
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

const storageOptions: ReadonlyArray<{ label: 'Fridge' | 'Freezer' | 'Ambient'; icon: any }> = [
  { label: 'Fridge', icon: require('../../../assets/placeholder/fridge_icon.png') },
  { label: 'Freezer', icon: require('../../../assets/placeholder/freezer_icon.png') },
  { label: 'Ambient', icon: require('../../../assets/placeholder/ambient_temp_icon.png') },
];

const reheatingOptions: ReadonlyArray<{ label: 'Yes' | 'No' | 'Not sure'; icon?: any }> = [
  { label: 'Yes', icon: require('../../../assets/placeholder/heating_icon.png') },
  { label: 'No', icon: require('../../../assets/placeholder/no_heating_icon.png') },
  { label: 'Not sure' },
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

type FarmItem = {
  name: string;
  qty: number;
  icon: any;
};

const farmSeedItems: FarmItem[] = [
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




function EditPeopleListingForm({
  navigation,
  listingId,
  initialListing,
}: {
  navigation: any;
  listingId: number;
  initialListing: ListingDetail;
}) {
  const { submitting, withLock } = useSubmitLock();
  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<FoodItem[]>(seedItems);
  const [customItem, setCustomItem] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [location, setLocation] = useState('');
  const [bestBeforeDate, setBestBeforeDate] = useState<Date | null>(null);
  const [pickupFromDate, setPickupFromDate] = useState<Date | null>(null);
  const [pickupToDate, setPickupToDate] = useState<Date | null>(null);

  const [storage, setStorage] = useState<'Fridge' | 'Freezer' | 'Ambient'>('Freezer');
  const [reheating, setReheating] = useState<'Yes' | 'No' | 'Not sure'>('No');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [confirmedSafe, setConfirmedSafe] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>('date');
  const [pickerValue, setPickerValue] = useState(new Date());

  const activeItems = useMemo(() => items.filter((item) => item.qty > 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const estimatedMeals = estimateMealsSaved(totalQuantity);
  const estimatedCO2 = estimateCo2AvoidedKg(totalQuantity);
  const hasSelectedAllergens = selectedAllergens.length > 0;

  useEffect(() => {
    const data = initialListing;
    setItems(mergePeopleFoodItems(data.foodItems ?? [], seedItems));
    setLocation(getListingPickupAddress(data));
    setBestBeforeDate(parseListingDate(data.bestBefore));
    setPickupFromDate(parseListingDate(getListingPickupFrom(data)));
    setPickupToDate(parseListingDate(getListingPickupTo(data)));
    setStorage(inferPeopleStorage(data));
    setReheating(inferReheating(data));
    setSelectedAllergens(inferPeopleAllergens(data));
    setImages(extractListingImages(data));
  }, [initialListing]);

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
    setItems((prev) => [...prev, { name: customItem.trim(), qty: 0, iconKey: 'preparedMeals' }]);
    setCustomItem('');
  };

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) => (
      prev.includes(allergen)
        ? prev.filter((entry) => entry !== allergen)
        : [...prev, allergen]
    ));
  };

  const selectAllAllergens = () => setSelectedAllergens([...ALLERGEN_OPTIONS]);

  const clearAllergens = () => setSelectedAllergens([]);

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsMultipleSelection: true,
    });

    if (!res.canceled) {
      setImages((prev) => [...prev, ...res.assets.map((item) => item.uri)]);
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
    if (target === 'bestBefore') setBestBeforeDate(value);
    if (target === 'from') setPickupFromDate(value);
    if (target === 'to') setPickupToDate(value);
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
      const timePart = pickerTarget === 'from' ? pickupFromDate || new Date() : pickupToDate || new Date();

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
      setStep(2);
      return;
    }

    if (step === 2) setStep(3);
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(1);
      return;
    }

    navigation.goBack();
  };

  const handleSaveChanges = async () => {
    if (submitting) return;

    if (!confirmedSafe) {
      Alert.alert('Confirmation required', 'Please confirm this food is safe for donation.');
      return;
    }
    if (activeItems.length === 0) {
      Alert.alert('Food details missing', 'Add at least one food item quantity.');
      setStep(1);
      return;
    }
    if (!bestBeforeDate || !pickupFromDate || !pickupToDate) {
      Alert.alert('Missing dates', 'Please set best before and pickup window.');
      setStep(2);
      return;
    }
    if (pickupToDate <= pickupFromDate) {
      Alert.alert('Invalid window', 'Pickup end time must be after pickup start time.');
      setStep(2);
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing location', 'Please enter a pickup address.');
      setStep(2);
      return;
    }

    await withLock(async () => {
      try {
        await foodListingService.updateListing(listingId, {
          foodItems: activeItems.map((item) => ({
            category: item.name,
            totalQtyKg: item.qty,
            remainingQtyKg: item.qty,
          })),
          pickupAddress: location.trim(),
          bestBefore: bestBeforeDate.toISOString(),
          pickupFromTime: pickupFromDate.toISOString(),
          pickupByTime: pickupToDate.toISOString(),
          needsRefrigeration: storage === 'Fridge',
          needsReheating: reheating === 'Yes',
          containsAllergens: hasSelectedAllergens,
          allergens: selectedAllergens,
          storage,
          reheating,
          isSafeForDonation: true,
        });
        invalidateListingDetail(listingId);
        useListingsStore.getState().invalidateSite();
        Alert.alert('Updated', 'Listing updated successfully', [
          { text: 'OK', onPress: () => navigation.navigate('RestaurantListings') },
        ]);
      } catch (error: unknown) {
        showErrorAlert(error, 'Could not update listing', 'Please try again.');
      }
    });
  };

  return (
    <Screen backgroundColor="#F2F5E9" scrollable contentStyle={peopleStyles.screenContent}>
      <View style={peopleStyles.pageWrap}>
        <View style={peopleStyles.topPanel}>
          <Pressable onPress={handleBack} style={peopleStyles.backBtn}>
            <Ionicons name="arrow-back" size={normalize(20)} color={palette.kale} />
          </Pressable>

          <Image
            source={require('../../../assets/placeholder/people_icon.png')}
            style={peopleStyles.peopleIcon}
            resizeMode="contain"
          />

          <AppText variant="h5" color={palette.black} style={peopleStyles.topTitle}>
            Edit listing
          </AppText>
          <AppText variant="body1" color={palette.midgray} style={peopleStyles.topSubtitle}>
            Update your surplus details below
          </AppText>

          <View style={peopleStyles.stepperRow}>
            {stepMeta.map((entry, index) => {
              const isActive = step === entry.id;
              const isDone = step > entry.id;

              return (
                <React.Fragment key={entry.id}>
                  <Pressable
                    onPress={() => (entry.id <= step ? setStep(entry.id) : undefined)}
                    style={[peopleStyles.stepDot, (isActive || isDone) && peopleStyles.stepDotActive]}
                  >
                    <AppText
                      variant="bodyBold"
                      color={isActive || isDone ? palette.white : palette.stone}
                      style={peopleStyles.stepDotText}
                    >
                      {entry.id}
                    </AppText>
                  </Pressable>

                  {index < stepMeta.length - 1 ? (
                    <View style={[peopleStyles.stepLine, step > entry.id && peopleStyles.stepLineActive]} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>

          <View style={peopleStyles.stepTitlesRow}>
            {stepMeta.map((entry) => (
              <AppText key={entry.id} variant="bodyBold" color={palette.black} style={peopleStyles.stepLabel}>
                {entry.title}
              </AppText>
            ))}
          </View>
        </View>

        {step === 1 ? (
          <View style={peopleStyles.stepWrap}>
            <AppText variant="h8" color={palette.black} style={peopleStyles.sectionTitle}>
              WHAT FOOD DO YOU HAVE?
            </AppText>
            <View style={peopleStyles.card}>
              <View style={peopleStyles.kgHeaderRow}>
                <View style={peopleStyles.foodNameColumn} />
                <AppText variant="body1" color={palette.stone} style={{ marginRight: wp(8) }}>
                  KG
                </AppText>
              </View>

              {items.map((item, index) => (
                <View key={`${item.name}-${index}`} style={peopleStyles.foodRow}>
                  <View style={peopleStyles.foodNameWrap}>
                    <Image source={resolveFoodIconSource(item.iconKey)} style={peopleStyles.foodIcon} />
                    <AppText variant="body1" color={palette.midgray} style={peopleStyles.foodLabel}>
                      {item.name}
                    </AppText>
                  </View>

                  <View style={peopleStyles.qtyWrap}>
                    <Pressable style={peopleStyles.qtyBtn} onPress={() => updateQty(index, -0.5)}>
                      <AppText variant="bodyBold" color={palette.stone}>
                        -
                      </AppText>
                    </Pressable>

                    <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.qtyValue}>
                      {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)}
                    </AppText>

                    <Pressable style={peopleStyles.qtyBtn} onPress={() => updateQty(index, 0.5)}>
                      <AppText variant="bodyBold" color={palette.stone}>
                        +
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={peopleStyles.addRow}>
                <TextInput
                  value={customItem}
                  onChangeText={setCustomItem}
                  placeholder="Add other item..."
                  placeholderTextColor={palette.stone}
                  style={peopleStyles.addInput}
                />
                <Pressable style={peopleStyles.addBtn} onPress={addCustomItem}>
                  <AppText variant="bodyBold" color={palette.white}>
                    +
                  </AppText>
                </Pressable>
              </View>
            </View>

            <AppText variant="h8" color={palette.black} style={peopleStyles.sectionTitle}>
              QUANTITY (KG)
            </AppText>
            <View style={peopleStyles.card}>
              <View style={peopleStyles.quantityPill}>
                <AppText variant="h2" color={palette.black}>
                  {totalQuantity} KG
                </AppText>
              </View>
              <AppText variant="caption" color={palette.stone} style={peopleStyles.helperText}>
                ESTIMATE TOTAL WEIGHT OF SURPLUS FOOD
              </AppText>
            </View>

            <AppText variant="h8" color={palette.black} style={peopleStyles.sectionTitle}>
              ADD PHOTO (OPTIONAL)
            </AppText>
            <View style={peopleStyles.card}>
              {images.length === 0 ? (
                <Pressable style={peopleStyles.photoPlaceholder} onPress={pickFromGallery}>
                  <AppText variant="h7" color={palette.stone}>
                    +
                  </AppText>
                </Pressable>
              ) : (
                <View style={peopleStyles.photoGrid}>
                  {images.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={peopleStyles.previewItem}>
                      <Image source={{ uri }} style={peopleStyles.previewImage} />
                      <Pressable style={peopleStyles.removePhotoBtn} onPress={() => removePhoto(index)}>
                        <Ionicons name="close" size={normalize(14)} color={palette.white} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={peopleStyles.photoStatsWrap}>
                <AppText variant="bodySmall" color={palette.stone}>
                  {images.length} photo(s) selected
                </AppText>
              </View>

              <View style={peopleStyles.photoButtonRow}>
                <Pressable style={peopleStyles.secondaryBtn} onPress={pickFromGallery}>
                  <AppText variant="bodyBold" color={palette.stone}>
                    Gallery
                  </AppText>
                </Pressable>

                <Pressable style={peopleStyles.primaryBtn} onPress={pickFromCamera}>
                  <AppText variant="bodyBold" color={palette.white}>
                    Camera
                  </AppText>
                </Pressable>
              </View>

              <AppText variant="caption" color={palette.stone} style={peopleStyles.helperText}>
                PHOTOS HELP CHARITIES PLAN COLLECTIONS
              </AppText>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={peopleStyles.stepWrap}>
            <AppText variant="h8" color={palette.black} style={peopleStyles.sectionTitle}>
              PICKUP LOCATION
            </AppText>
            <View style={peopleStyles.card}>
              <View style={peopleStyles.locationBox}>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter pickup address"
                  placeholderTextColor={palette.stone}
                  style={peopleStyles.locationInput}
                />
              </View>
            </View>

            <AppText variant="h8" color={palette.black} style={peopleStyles.fieldLabel}>
              FOOD BEST BEFORE
            </AppText>
            <Pressable style={peopleStyles.selectorRow} onPress={() => openDatePicker('bestBefore')}>
              <Ionicons name="calendar-outline" size={normalize(20)} color={palette.kale} />
              <AppText variant="bodyBold" color={palette.midgray}>
                {formatDate(bestBeforeDate)}
              </AppText>
            </Pressable>

            <AppText variant="h8" color={palette.black} style={peopleStyles.fieldLabel}>
              PICKUP WINDOW
            </AppText>
            <View style={peopleStyles.windowRow}>
              <Pressable style={peopleStyles.windowBox} onPress={() => openDatePicker('from')}>
                <AppText variant="caption" color={palette.stone}>
                  FROM
                </AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.windowValue}>
                  {formatDateShort(pickupFromDate)}{`\n`}{formatTime(pickupFromDate)}
                </AppText>
              </Pressable>

              <Pressable style={peopleStyles.windowBox} onPress={() => openDatePicker('to')}>
                <AppText variant="caption" color={palette.stone}>
                  TO
                </AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.windowValue}>
                  {formatDateShort(pickupToDate)}{`\n`}{formatTime(pickupToDate)}
                </AppText>
              </Pressable>
            </View>

            <AppText variant="h8" color={palette.black} style={peopleStyles.fieldLabel}>
              STORAGE REQUIREMENTS
            </AppText>
            <View style={peopleStyles.chipRow}>
              {storageOptions.map((option) => {
                const active = storage === option.label;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setStorage(option.label)}
                    style={[peopleStyles.choiceChip, active && peopleStyles.choiceChipActive]}
                  >
                    <Image
                      source={option.icon}
                      style={{ width: normalize(18), height: normalize(18) }}
                    />
                    <AppText variant="bodyBold" color={active ? palette.kale : palette.stone}>
                      {option.label}
                    </AppText>
                    {active ? <Ionicons name="checkmark-circle" size={normalize(15)} color={palette.kale} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <AppText variant="h8" color={palette.black} style={peopleStyles.fieldLabel}>
              REHEATING REQUIRED?
            </AppText>
            <View style={peopleStyles.chipRow}>
              {reheatingOptions.map((option) => {
                const active = reheating === option.label;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setReheating(option.label)}
                    style={[peopleStyles.choiceChip, active && peopleStyles.choiceChipActive]}
                  >
                    {option.icon ? (
                      <Image
                        source={option.icon}
                        style={{ width: normalize(18), height: normalize(18) }}
                      />
                    ) : (
                      <Ionicons name={option.icon} size={normalize(18)} color={active ? palette.kale : palette.stone} />
                    )}
                    <AppText variant="bodyBold" color={active ? palette.kale : palette.stone}>
                      {option.label}
                    </AppText>
                    {active ? <Ionicons name="checkmark-circle" size={normalize(15)} color={palette.kale} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <AppText variant="h8" color={palette.black} style={peopleStyles.fieldLabel}>
              ALLERGENS (OPTIONAL)
            </AppText>
            <View style={peopleStyles.allergenCard}>
              <View style={peopleStyles.allergenActionsRow}>
                <Pressable style={peopleStyles.allergenActionBtn} onPress={selectAllAllergens}>
                  <AppText variant="bodyBold" color={palette.kale}>
                    Select all
                  </AppText>
                </Pressable>

                <Pressable style={peopleStyles.allergenActionBtn} onPress={clearAllergens}>
                  <AppText variant="bodyBold" color={palette.stone}>
                    Clear
                  </AppText>
                </Pressable>
              </View>

              <View style={peopleStyles.allergenChipWrap}>
                {ALLERGEN_OPTIONS.map((allergen) => {
                  const active = selectedAllergens.includes(allergen);

                  return (
                    <Pressable
                      key={allergen}
                      onPress={() => toggleAllergen(allergen)}
                      style={[peopleStyles.allergenChip, active && peopleStyles.allergenChipActive]}
                    >
                      <AppText variant="bodySmall" color={active ? palette.kale : palette.stone}>
                        {allergen}
                      </AppText>
                      {active ? <Ionicons name="checkmark-circle" size={normalize(14)} color={palette.kale} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              <View style={peopleStyles.allergenSummaryRow}>
                <Image
                  source={require('../../../assets/placeholder/allergen_icon.png')}
                  style={peopleStyles.allergenSummaryIcon}
                />
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.allergenSummaryText}>
                  {hasSelectedAllergens ? selectedAllergens.join(', ') : 'No allergens selected'}
                </AppText>
              </View>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={peopleStyles.stepWrap}>
            <AppText variant="h8" color={palette.black} style={peopleStyles.sectionTitle}>
              FOOD SUMMARY
            </AppText>
            <View style={peopleStyles.card}>
              <View style={peopleStyles.summaryHeadRow}>
                <AppText variant="bodyBold" color={palette.stone}>
                  ITEM NAME
                </AppText>
                <AppText variant="bodyBold" color={palette.stone}>
                  AVAILABLE
                </AppText>
              </View>

              {(activeItems.length > 0 ? activeItems : items.slice(0, 4)).map((item, index) => (
                <View key={`${item.name}-${index}`} style={peopleStyles.summaryRow}>
                  <View style={peopleStyles.summaryItemNameWrap}>
                    <Image source={resolveFoodIconSource(item.iconKey)} style={peopleStyles.summaryFoodIcon} />
                    <AppText variant="body1" color={palette.midgray} style={peopleStyles.summaryItemNameText}>
                      {item.name}
                    </AppText>
                  </View>
                  <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.summaryQtyText}>
                    {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)} kg
                  </AppText>
                </View>
              ))}

              <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.totalQtyText}>
                Total Quantity: {Math.max(totalQuantity, 0)} kg
              </AppText>
            </View>

            <AppText variant="h8" color={palette.black} style={peopleStyles.sectionTitle}>
              COLLECTION SUMMARY
            </AppText>
            <View style={peopleStyles.card}>
              <View style={peopleStyles.summaryInfoRow}>
                <Ionicons name="location-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.summaryInfoText}>
                  {location || 'Address not provided'}
                </AppText>
              </View>

              <View style={peopleStyles.summaryInfoRow}>
                <Ionicons name="calendar-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.summaryInfoText}>
                  Best Before - {formatDate(bestBeforeDate)}
                </AppText>
              </View>

              <View style={peopleStyles.summaryInfoRow}>
                <Ionicons name="time-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.summaryInfoText}>
                  Pick up - {formatDateShort(pickupFromDate)} {formatTime(pickupFromDate)} to {formatDateShort(pickupToDate)} {formatTime(pickupToDate)}
                </AppText>
              </View>

              <View style={peopleStyles.summaryInfoRow}>
                <Ionicons name="snow-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.summaryInfoText}>
                  {storage}
                </AppText>
              </View>

              <View style={peopleStyles.summaryInfoRow}>
                <Ionicons name="flame-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.summaryInfoText}>
                  Reheating - {reheating}
                </AppText>
              </View>

              <View style={peopleStyles.summaryInfoRow}>
                <Ionicons name="alert-circle-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={peopleStyles.summaryInfoText}>
                  Allergens - {hasSelectedAllergens ? selectedAllergens.join(', ') : 'None selected'}
                </AppText>
              </View>
            </View>

            <Pressable style={peopleStyles.confirmWrap} onPress={() => setConfirmedSafe((prev) => !prev)}>
              <View style={[peopleStyles.checkbox, confirmedSafe && peopleStyles.checkboxActive]}>
                {confirmedSafe ? <Ionicons name="checkmark" size={normalize(15)} color={palette.white} /> : null}
              </View>
              <AppText variant="body1" color={palette.midgray} style={peopleStyles.confirmText}>
                I confirm this food is safe for human consumption and suitable for charity donation. See{' '}
                <AppText
                  variant="body1"
                  style={peopleStyles.termsLink}
                  onPress={() => Linking.openURL('https://www.saveful.com/saveful-for-business-terms-conditions') }
                >
                  Terms & Conditions
                </AppText>
              </AppText>
            </Pressable>

            <View style={peopleStyles.impactCard}>
              <AppText variant="h8" color={palette.success}>
                Your Impact
              </AppText>
              <View style={peopleStyles.impactRow}>
                <View style={peopleStyles.impactBlock}>
                  <Ionicons name="restaurant-outline" size={normalize(18)} color={palette.success} />
                  <AppText variant="h7" color={palette.success}>
                    {Math.max(estimatedMeals, 0)}
                  </AppText>
                  <AppText variant="bodySmall" color={palette.success}>
                    meals saved
                  </AppText>
                </View>

                <View style={peopleStyles.impactBlock}>
                  <Ionicons name="leaf-outline" size={normalize(18)} color={palette.success} />
                  <AppText variant="h7" color={palette.success}>
                    {formatCo2AvoidedKg(totalQuantity)}kg
                  </AppText>
                  <AppText variant="bodySmall" color={palette.success}>
                    CO2 avoided
                  </AppText>
                </View>
              </View>
              <AppText variant="bodySmall" color={palette.success}>
                420g = 1 meal
              </AppText>
            </View>
          </View>
        ) : null}

        <Pressable
          style={[peopleStyles.bottomButton, submitting && peopleStyles.bottomButtonDisabled]}
          onPress={step === 3 ? handleSaveChanges : handleContinue}
          disabled={submitting}
        >
          <AppText variant="bodyBold" color={palette.white}>
            {step === 3 ? (submitting ? 'SAVING...' : 'SAVE CHANGES') : 'CONTINUE'}
          </AppText>
          {!submitting ? (
            <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
          ) : null}
        </Pressable>
      </View>

      {Platform.OS === 'ios' ? (
        <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={closeIOSPicker}>
          <View style={peopleStyles.iosPickerOverlay}>
            <View style={peopleStyles.iosPickerCard}>
              <View style={peopleStyles.iosPickerActions}>
                <Pressable onPress={closeIOSPicker}>
                  <AppText variant="bodyBold" color={palette.stone}>Cancel</AppText>
                </Pressable>
                <Pressable onPress={confirmIOSPicker}>
                  <AppText variant="bodyBold" color={palette.kale}>Done</AppText>
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




function EditFarmListingForm({
  navigation,
  listingId,
  initialListing,
}: {
  navigation: any;
  listingId: number;
  initialListing: ListingDetail;
}) {
  const { width: winWidth } = useWindowDimensions();
  const gridLayout = useMemo(() => getGridLayout(winWidth), [winWidth]);
  const { submitting, withLock } = useSubmitLock();

  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<FarmItem[]>(farmSeedItems);
  const [customItem, setCustomItem] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [location, setLocation] = useState('');
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

  const activeItems = useMemo(() => items.filter((item) => item.qty > 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const estimatedMeals = estimateMealsSaved(totalQuantity);
  const estimatedCO2 = estimateCo2AvoidedKg(totalQuantity);

  useEffect(() => {
    const data = initialListing;
    setItems(mergeFarmFoodItems(data.foodItems ?? [], farmSeedItems));
    setLocation(getListingPickupAddress(data));
    setBestBeforeDate(parseListingDate(data.bestBefore));
    setPickupFromDate(parseListingDate(getListingPickupFrom(data)));
    setPickupToDate(parseListingDate(getListingPickupTo(data)));
    setSelectedStorage(inferFarmStorage(data));
    setSelectedContaminants(inferContaminants(data));
    setImages(extractListingImages(data));
  }, [initialListing]);

  // ── helpers ──────────────────────────────────────────────────────────────

  const handleBack = () => {
    if (step === 3) { setStep(2); return; }
    if (step === 2) { setStep(1); return; }
    navigation.goBack();
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
    if (target === 'bestBefore') setBestBeforeDate(value);
    if (target === 'from') setPickupFromDate(value);
    if (target === 'to') setPickupToDate(value);
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
    if (step === 1) { setStep(2); return; }
    if (step === 2) { setStep(3); }
  };

  const handleSaveChanges = async () => {
    if (submitting) return;

    if (!confirmedSafe) {
      Alert.alert('Confirmation required', 'Please confirm this material is for livestock/agricultural use.');
      return;
    }
    if (activeItems.length === 0) {
      Alert.alert('Food details missing', 'Add at least one food item quantity.');
      setStep(1);
      return;
    }
    if (!bestBeforeDate || !pickupFromDate || !pickupToDate) {
      Alert.alert('Missing dates', 'Please set best before and pickup window.');
      setStep(2);
      return;
    }
    if (pickupToDate <= pickupFromDate) {
      Alert.alert('Invalid window', 'Pickup end time must be after pickup start time.');
      setStep(2);
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing location', 'Please enter a pickup address.');
      setStep(2);
      return;
    }

    await withLock(async () => {
      try {
        await foodListingService.updateListing(listingId, {
          foodItems: activeItems.map((item) => ({
            category: item.name,
            totalQtyKg: item.qty,
            remainingQtyKg: item.qty,
          })),
          pickupAddress: location.trim(),
          bestBefore: bestBeforeDate.toISOString(),
          pickupFromTime: pickupFromDate.toISOString(),
          pickupByTime: pickupToDate.toISOString(),
          needsRefrigeration:
            selectedStorage.includes('Fridge') || selectedStorage.includes('Freezer'),
          containsAllergens: selectedContaminants.length > 0,
          storage: selectedStorage,
          contaminants: selectedContaminants,
          isSafeForDonation: false,
        });
        invalidateListingDetail(listingId);
        useListingsStore.getState().invalidateSite();
        Alert.alert('Updated', 'Listing updated successfully', [
          { text: 'OK', onPress: () => navigation.navigate('RestaurantListings') },
        ]);
      } catch (error: unknown) {
        showErrorAlert(error, 'Could not update listing', 'Please try again.');
      }
    });
  };

  return (
    <Screen backgroundColor={FARM_BG} scrollable contentStyle={farmStyles.screenContent}>
      <View style={farmStyles.pageWrap}>

        <View style={farmStyles.topPanel}>
          <Pressable onPress={handleBack} style={farmStyles.backBtn}>
            <Ionicons name="arrow-back" size={normalize(20)} color={FARM_ACCENT} />
          </Pressable>

          <Image
            source={require('../../../assets/placeholder/livestock.png')}
            style={farmStyles.topIcon}
            resizeMode="contain"
          />

          <AppText variant="h5" color={palette.black} style={farmStyles.topTitle}>
            Edit listing
          </AppText>
          <AppText variant="body1" color={palette.midgray} style={farmStyles.topSubtitle}>
            Update your surplus details below
          </AppText>

          {/* STEPPER */}
          <View style={farmStyles.stepperRow}>
            {stepMeta.map((entry, index) => {
              const isActive = step === entry.id;
              const isDone = step > entry.id;
              return (
                <React.Fragment key={entry.id}>
                  <Pressable
                    onPress={() => (entry.id <= step ? setStep(entry.id) : undefined)}
                    style={[farmStyles.stepDot, (isActive || isDone) && farmStyles.stepDotActive]}
                  >
                    <AppText
                      variant="bodyBold"
                      color={isActive || isDone ? palette.white : palette.stone}
                      style={farmStyles.stepDotText}
                    >
                      {entry.id}
                    </AppText>
                  </Pressable>

                  {index < stepMeta.length - 1 ? (
                    <View style={[farmStyles.stepLine, step > entry.id && farmStyles.stepLineActive]} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>

          <View style={farmStyles.stepTitlesRow}>
            {stepMeta.map((entry) => (
              <AppText
                key={entry.id}
                variant="bodyBold"
                color={palette.black}
                style={farmStyles.stepLabel}
              >
                {entry.title}
              </AppText>
            ))}
          </View>
        </View>

        {step === 1 ? (
          <View style={farmStyles.stepWrap}>
            {/* Food items */}
            <AppText variant="h8" color={palette.black} style={farmStyles.sectionTitle}>
              WHAT FOOD DO YOU HAVE?
            </AppText>
            <View style={farmStyles.card}>
              <View style={farmStyles.kgHeaderRow}>
                <View style={farmStyles.foodNameColumn} />
                <AppText variant="body1" color={palette.stone} style={{ marginRight: wp(8) }}>
                  KG
                </AppText>
              </View>

              {items.map((item, index) => (
                <View key={`${item.name}-${index}`} style={farmStyles.foodRow}>
                  <View style={farmStyles.foodNameWrap}>
                    <Image source={item.icon} style={farmStyles.foodIcon} />
                    <AppText variant="body1" color={palette.midgray} style={farmStyles.foodLabel} numberOfLines={2}>
                      {item.name}
                    </AppText>
                  </View>
                  <View style={farmStyles.qtyWrap}>
                    <Pressable style={farmStyles.qtyBtn} onPress={() => updateQty(index, -0.5)}>
                      <AppText variant="bodyBold" color={palette.stone}>-</AppText>
                    </Pressable>
                    <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.qtyValue}>
                      {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)}
                    </AppText>
                    <Pressable style={farmStyles.qtyBtn} onPress={() => updateQty(index, 0.5)}>
                      <AppText variant="bodyBold" color={palette.stone}>+</AppText>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={farmStyles.addRow}>
                <TextInput
                  value={customItem}
                  onChangeText={setCustomItem}
                  placeholder="Add other item..."
                  placeholderTextColor={palette.stone}
                  style={farmStyles.addInput}
                />
                <Pressable style={farmStyles.addBtn} onPress={addCustomItem}>
                  <AppText variant="bodyBold" color={palette.white}>+</AppText>
                </Pressable>
              </View>
            </View>

            {/* Total quantity */}
            <AppText variant="h8" color={palette.black} style={farmStyles.sectionTitle}>
              QUANTITY (KG)
            </AppText>
            <View style={farmStyles.card}>
              <View style={farmStyles.quantityPill}>
                <AppText variant="h2" color={palette.black}>{totalQuantity} KG</AppText>
              </View>
              <AppText variant="caption" color={palette.stone} style={farmStyles.helperText}>
                ESTIMATE TOTAL WEIGHT OF SURPLUS FOOD
              </AppText>
            </View>

            {/* Photos */}
            <AppText variant="h8" color={palette.black} style={farmStyles.sectionTitle}>
              ADD PHOTO (OPTIONAL)
            </AppText>
            <View style={farmStyles.card}>
              {images.length === 0 ? (
                <Pressable style={farmStyles.photoPlaceholder} onPress={pickFromGallery}>
                  <AppText variant="h7" color={palette.stone}>+</AppText>
                </Pressable>
              ) : (
                <View style={farmStyles.photoGrid}>
                  {images.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={farmStyles.previewItem}>
                      <Image source={{ uri }} style={farmStyles.previewImage} />
                      <Pressable style={farmStyles.removePhotoBtn} onPress={() => removePhoto(index)}>
                        <Ionicons name="close" size={normalize(14)} color={palette.white} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <View style={farmStyles.photoStatsWrap}>
                <AppText variant="bodySmall" color={palette.stone}>
                  {images.length} photo(s) selected
                </AppText>
              </View>
              <View style={farmStyles.photoButtonRow}>
                <Pressable style={farmStyles.secondaryBtn} onPress={pickFromGallery}>
                  <AppText variant="bodyBold" color={palette.stone}>Gallery</AppText>
                </Pressable>
                <Pressable style={farmStyles.primaryBtn} onPress={pickFromCamera}>
                  <AppText variant="bodyBold" color={palette.white}>Camera</AppText>
                </Pressable>
              </View>
              <AppText variant="caption" color={palette.stone} style={farmStyles.helperText}>
                PHOTOS HELP FARMERS PLAN COLLECTIONS
              </AppText>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={farmStyles.stepWrap}>
            {/* Pickup location */}
            <AppText variant="h8" color={palette.black} style={farmStyles.sectionTitle}>
              PICKUP LOCATION
            </AppText>
            <View style={farmStyles.card}>
              <View style={farmStyles.locationBox}>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter pickup address"
                  placeholderTextColor={palette.stone}
                  style={farmStyles.locationInput}
                />
              </View>
            </View>

            {/* Best before */}
            <AppText variant="h8" color={palette.black} style={farmStyles.fieldLabel}>
              FOOD BEST BEFORE
            </AppText>
            <Pressable style={farmStyles.selectorRow} onPress={() => openDatePicker('bestBefore')}>
              <Ionicons name="calendar-outline" size={normalize(20)} color={FARM_ACCENT} />
              <AppText variant="bodyBold" color={palette.midgray}>
                {formatDate(bestBeforeDate)}
              </AppText>
            </Pressable>

            {/* Pickup window */}
            <AppText variant="h8" color={palette.black} style={farmStyles.fieldLabel}>
              PICKUP WINDOW
            </AppText>
            <View style={farmStyles.windowRow}>
              <Pressable style={farmStyles.windowBox} onPress={() => openDatePicker('from')}>
                <AppText variant="caption" color={palette.stone}>FROM</AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.windowValue}>
                  {formatDateShort(pickupFromDate)}{'\n'}{formatTime(pickupFromDate)}
                </AppText>
              </Pressable>
              <Pressable style={farmStyles.windowBox} onPress={() => openDatePicker('to')}>
                <AppText variant="caption" color={palette.stone}>TO</AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.windowValue}>
                  {formatDateShort(pickupToDate)}{'\n'}{formatTime(pickupToDate)}
                </AppText>
              </Pressable>
            </View>

            {/* Storage / Handling – multi-select */}
            <AppText variant="h8" color={palette.black} style={farmStyles.fieldLabel}>
              STORAGE / HANDLING
            </AppText>
            <View style={farmStyles.chipGrid}>
              {STORAGE_OPTIONS.map((option, index) => {
                const active = selectedStorage.includes(option.label);
                const showIcon = option.useImage || option.label !== 'Other';
                const isLastInRow = index % STORAGE_COLS === STORAGE_COLS - 1;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => toggleStorage(option.label)}
                    style={[
                      farmStyles.gridChip,
                      farmStyles.storageChip,
                      {
                        width: gridLayout.storageWidth,
                        marginRight: isLastInRow ? 0 : gridLayout.gap,
                        marginBottom: gridLayout.gap,
                        flexShrink: 0,
                      },
                      active && farmStyles.gridChipActive,
                    ]}
                  >
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={normalize(12)}
                        color={FARM_ACCENT}
                        style={farmStyles.gridChipCheck}
                      />
                    ) : null}
                    {showIcon ? (
                      option.useImage ? (
                        <Image
                          source={(option as any).icon}
                          style={farmStyles.storageChipIcon}
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
                      style={farmStyles.storageChipText}
                      numberOfLines={2}
                    >
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Possible contaminants – multi-select */}
            <AppText variant="h8" color={palette.black} style={farmStyles.fieldLabel}>
              POSSIBLE CONTAMINANTS - SELECT ALL THAT APPLY
            </AppText>
            <View style={farmStyles.chipGrid}>
              {CONTAMINANT_OPTIONS.map((label, index) => {
                const active = selectedContaminants.includes(label);
                const isLastInRow = index % CONTAMINANT_COLS === CONTAMINANT_COLS - 1;
                return (
                  <Pressable
                    key={label}
                    onPress={() => toggleContaminant(label)}
                    style={[
                      farmStyles.gridChip,
                      farmStyles.contaminantChip,
                      {
                        width: gridLayout.contaminantWidth,
                        marginRight: isLastInRow ? 0 : gridLayout.gap,
                        marginBottom: gridLayout.gap,
                        flexShrink: 0,
                      },
                      active && farmStyles.gridChipActive,
                    ]}
                  >
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={normalize(12)}
                        color={FARM_ACCENT}
                        style={farmStyles.gridChipCheck}
                      />
                    ) : null}
                    <AppText
                      variant="bodyBold"
                      color={active ? FARM_ACCENT : palette.stone}
                      style={farmStyles.contaminantChipText}
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
          <View style={farmStyles.stepWrap}>
            {/* Food summary */}
            <AppText variant="h8" color={palette.black} style={farmStyles.sectionTitle}>
              FOOD SUMMARY
            </AppText>
            <View style={farmStyles.card}>
              <View style={farmStyles.summaryHeadRow}>
                <AppText variant="bodyBold" color={palette.stone}>ITEM NAME</AppText>
                <AppText variant="bodyBold" color={palette.stone}>AVAILABLE</AppText>
              </View>

              {activeItems.map((item, index) => (
                <View key={`${item.name}-${index}`} style={farmStyles.summaryRow}>
                  <View style={farmStyles.summaryItemNameWrap}>
                    <Image source={item.icon} style={farmStyles.summaryFoodIcon} />
                    <AppText variant="body1" color={palette.midgray} style={farmStyles.summaryItemNameText}>
                      {item.name}
                    </AppText>
                  </View>
                  <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.summaryQtyText}>
                    {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)} kg
                  </AppText>
                </View>
              ))}

              {activeItems.length === 0 ? (
                <AppText variant="body1" color={palette.stone} style={{ textAlign: 'center', marginVertical: hp(1) }}>
                  No items selected
                </AppText>
              ) : null}

              <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.totalQtyText}>
                Total Quantity: {Math.max(totalQuantity, 0)} kg
              </AppText>
            </View>

            {/* Collection summary */}
            <AppText variant="h8" color={palette.black} style={farmStyles.sectionTitle}>
              COLLECTION SUMMARY
            </AppText>
            <View style={farmStyles.card}>
              <View style={farmStyles.summaryInfoRow}>
                <Ionicons name="location-outline" size={normalize(18)} color={FARM_ACCENT} />
                <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.summaryInfoText}>
                  {location || 'Address not provided'}
                </AppText>
              </View>

              <View style={farmStyles.summaryInfoRow}>
                <Ionicons name="calendar-outline" size={normalize(18)} color={FARM_ACCENT} />
                <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.summaryInfoText}>
                  Best Before - {formatDate(bestBeforeDate)}
                </AppText>
              </View>

              <View style={farmStyles.summaryInfoRow}>
                <Ionicons name="time-outline" size={normalize(18)} color={FARM_ACCENT} />
                <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.summaryInfoText}>
                  Pick up - {formatDateShort(pickupFromDate)} {formatTime(pickupFromDate)} to{' '}
                  {formatDateShort(pickupToDate)} {formatTime(pickupToDate)}
                </AppText>
              </View>

              {selectedStorage.length > 0 ? (
                selectedStorage.map((s) => (
                  <View key={s} style={farmStyles.summaryInfoRow}>
                    <Ionicons name="cube-outline" size={normalize(18)} color={FARM_ACCENT} />
                    <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.summaryInfoText}>
                      {s}
                    </AppText>
                  </View>
                ))
              ) : null}

              {selectedContaminants.length > 0 ? (
                <View style={farmStyles.summaryInfoRow}>
                  <Ionicons name="alert-circle-outline" size={normalize(18)} color={FARM_ACCENT} />
                  <AppText variant="bodyBold" color={palette.midgray} style={farmStyles.summaryInfoText}>
                    {selectedContaminants.join(', ')}
                  </AppText>
                </View>
              ) : null}
            </View>

            {/* Confirmation checkbox */}
            <Pressable style={farmStyles.confirmWrap} onPress={() => setConfirmedSafe((prev) => !prev)}>
              <View style={[farmStyles.checkbox, confirmedSafe && farmStyles.checkboxActive]}>
                {confirmedSafe ? (
                  <Ionicons name="checkmark" size={normalize(15)} color={palette.white} />
                ) : null}
              </View>
              <AppText variant="body1" color={palette.midgray} style={farmStyles.confirmText}>
                I confirm this material IS NOT suitable for human consumption and is only appropriate
                for animal livestock feed or agricultural reuse. See{' '}
                <AppText
                  variant="body1"
                  style={farmStyles.termsLink}
                  onPress={() => Linking.openURL('https://www.saveful.com/saveful-for-business-terms-conditions')}
                >
                  Terms & Conditions
                </AppText>
              </AppText>
            </Pressable>

            {/* Impact */}
            <View style={farmStyles.impactCard}>
              <AppText variant="h8" color={palette.middlegreen}>
                Your Impact
              </AppText>
              <View style={farmStyles.impactRow}>
                <View style={farmStyles.impactBlock}>
                  <Ionicons name="restaurant-outline" size={normalize(18)} color={palette.middlegreen} />
                  <View style={farmStyles.impactBlockContent}>
                    <AppText variant="h7" color={palette.middlegreen} style={farmStyles.impactValue}>
                      {Math.max(estimatedMeals, 0)}
                    </AppText>
                    <AppText variant="bodySmall" color={palette.middlegreen} style={farmStyles.impactLabel}>
                      meals saved
                    </AppText>
                  </View>
                </View>

                <View style={farmStyles.impactBlock}>
                  <Image
                    source={require('../../../assets/placeholder/co2_green_icon.png')}
                    style={farmStyles.impactIcon}
                  />
                  <View style={farmStyles.impactBlockContent}>
                    <AppText variant="h7" color={palette.middlegreen} style={farmStyles.impactValue}>
                      {formatCo2AvoidedKg(totalQuantity)}kg
                    </AppText>
                    <AppText variant="bodySmall" color={palette.middlegreen} style={farmStyles.impactLabel}>
                      CO2 avoided
                    </AppText>
                  </View>
                </View>
              </View>
              <AppText variant="bodySmall" color={palette.middlegreen} style={farmStyles.impactFootnote}>
                420g = 1 meal · CO₂ = food kg × 2.1
              </AppText>
            </View>
          </View>
        ) : null}

        {/* BOTTOM BUTTON */}
        <Pressable
          style={[farmStyles.bottomButton, submitting && farmStyles.bottomButtonDisabled]}
          onPress={step === 3 ? handleSaveChanges : handleContinue}
          disabled={submitting}
        >
          <AppText variant="bodyBold" color={palette.white}>
            {step === 3 ? (submitting ? 'SAVING...' : 'SAVE CHANGES') : 'CONTINUE'}
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
          <View style={farmStyles.iosPickerOverlay}>
            <View style={farmStyles.iosPickerCard}>
              <View style={farmStyles.iosPickerActions}>
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



export function EditListingScreen({ navigation, route }: any) {
  const { listingId } = route.params;
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<ListingDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchListingDetail(listingId, { refresh: true });
        if (cancelled) return;
        setListing(data);
      } catch (error: unknown) {
        if (!cancelled) {
          showErrorAlert(error, 'Could not load listing', 'Failed to load listing details');
          navigation.goBack();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, navigation]);

  if (loading) {
    return (
      <Screen backgroundColor="#F2F5E9">
        <View style={loaderStyles.wrap}>
          <ActivityIndicator size="large" color={palette.kale} />
          <AppText variant="body1" color={palette.midgray} style={loaderStyles.text}>
            Loading listing…
          </AppText>
        </View>
      </Screen>
    );
  }

  if (!listing) return null;

  if (isAnimalListing(listing)) {
    return (
      <EditFarmListingForm
        navigation={navigation}
        listingId={listingId}
        initialListing={listing}
      />
    );
  }

  return (
    <EditPeopleListingForm
      navigation={navigation}
      listingId={listingId}
      initialListing={listing}
    />
  );
}

const loaderStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp(20),
  },
  text: {
    marginTop: hp(2),
  },
});

const peopleStyles = StyleSheet.create({
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
  topPanel: {
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    borderWidth: normalize(1.5),
    borderColor: '#B8C6B1',
    backgroundColor: '#F8FBF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.3),
  },
  peopleIcon: {
    width: wp(20),
    height: hp(10),
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
    backgroundColor: palette.kale,
    borderColor: palette.kale,
  },
  stepDotText: {
    fontSize: normalize(12),
    lineHeight: normalize(13),
  },
  stepLine: {
    width: wp(17.5),
    height: normalize(3),
    borderRadius: normalize(2),
    backgroundColor: '#8D8D8D',
  },
  stepLineActive: {
    backgroundColor: palette.kale,
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
  relistCard: {
    borderWidth: normalize(2),
    borderColor: palette.kale,
    backgroundColor: '#F0F5E8',
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
    backgroundColor: palette.kale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
  },
  sectionTitle: {
    marginTop: hp(0.2),
  },
  card: {
    borderWidth: normalize(2),
    borderColor: '#D9D9D9',
    borderRadius: normalize(14),
    backgroundColor: '#F8F8F6',
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    gap: hp(0.8),
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
  },
  foodLabel: {
    marginLeft: wp(2),
    textTransform: 'none',
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
  },
  foodIcon: {
    width: normalize(22),
    height: normalize(22),
  },
  qtyBtn: {
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: normalize(8),
    backgroundColor: '#E6E2F1',
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
  helperText: {
    textAlign: 'left',
  },
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
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    marginTop: hp(0.5),
    textTransform: 'none',
  },
  locationBox: {
    borderRadius: normalize(12),
    borderWidth: normalize(1),
    borderColor: '#D9D9D9',
    backgroundColor: palette.creme,
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
    borderColor: '#DADCD0',
    backgroundColor: palette.white,
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
    borderColor: '#DADCD0',
    backgroundColor: '#ECEDEA',
    paddingHorizontal: wp(3),
    justifyContent: 'center',
  },
  windowValue: {
    marginTop: hp(0.3),
    textTransform: 'none',
  },
  chipRow: {
    flexDirection: 'row',
    gap: wp(2.2),
  },
  allergenCard: {
    borderWidth: normalize(1),
    borderColor: '#DADCD0',
    borderRadius: normalize(12),
    backgroundColor: palette.white,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: hp(0.8),
  },
  allergenActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  allergenActionBtn: {
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2.5),
    borderRadius: normalize(999),
    backgroundColor: '#F4F4EE',
  },
  allergenChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
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
  allergenChipActive: {
    borderColor: '#8CBD97',
    backgroundColor: '#ECF5E9',
  },
  allergenSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  allergenSummaryIcon: {
    width: normalize(20),
    height: normalize(20),
  },
  allergenSummaryText: {
    flex: 1,
    textTransform: 'none',
  },
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
  choiceChipActive: {
    borderColor: '#8CBD97',
    backgroundColor: '#ECF5E9',
  },
  summaryHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: normalize(1),
    borderBottomColor: '#D6D9CE',
    paddingBottom: hp(0.4),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(0.2),
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
    width: normalize(16),
    height: normalize(16),
  },
  summaryQtyText: {
    marginLeft: wp(2),
    minWidth: wp(16),
    textAlign: 'right',
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
  checkboxActive: {
    backgroundColor: palette.kale,
  },
  confirmText: {
    flex: 1,
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  impactCard: {
    borderWidth: normalize(1.5),
    borderColor: '#C1D5BF',
    borderRadius: normalize(14),
    backgroundColor: '#E9F4E5',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    gap: hp(0.8),
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  impactBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.4),
  },
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


const farmStyles = StyleSheet.create({
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
  backBtn: {
    alignSelf: 'flex-start',
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    borderWidth: normalize(1.5),
    borderColor: '#F0C89A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(1),
    marginBottom: hp(0.3),
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
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: normalize(8),
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

  // ── iOS picker ────────────────────────────────────────────────────────────
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