import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

import { AppText } from './AppText';
import { normalize } from '@/utils/responsive';
import {
  completeCircularImageCrop,
  registerCircularCropListener,
} from '@/utils/circularImageCrop';

const WHITE = '#FFFFFF';
const OVERLAY = 'rgba(0, 0, 0, 0.55)';
const OUTPUT_SIZE = 512;
const HANDLE = 22;

type CropSession = {
  uri: string;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function CircularImageCropHost() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<CropSession | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);

  const { width: screenW, height: screenH } = Dimensions.get('window');
  const minCrop = Math.min(screenW, screenH) * 0.28;
  const maxCrop = Math.min(screenW, screenH) - 32;
  const initialCrop = Math.min(screenW, screenH) * 0.72;

  const [cropSize, setCropSize] = useState(initialCrop);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startCrop = useSharedValue(initialCrop);
  const baseW = useSharedValue(screenW);
  const baseH = useSharedValue(screenH);
  const crop = useSharedValue(initialCrop);
  const minCropSV = useSharedValue(minCrop);
  const maxCropSV = useSharedValue(maxCrop);

  useEffect(() => {
    minCropSV.value = minCrop;
    maxCropSV.value = maxCrop;
  }, [maxCrop, maxCropSV, minCrop, minCropSV]);

  const syncCropSize = (next: number) => {
    setCropSize(next);
  };

  useEffect(() => {
    registerCircularCropListener((request) => {
      if (!request) {
        setSession(null);
        setImageSize(null);
        setSaving(false);
        setRotating(false);
        return;
      }

      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      crop.value = initialCrop;
      setCropSize(initialCrop);
      setImageSize(null);
      setSaving(false);
      setRotating(false);
      setSession({ uri: request.uri });

      Image.getSize(
        request.uri,
        (width, height) => setImageSize({ width, height }),
        () => setImageSize({ width: 1024, height: 1024 }),
      );
    });

    return () => registerCircularCropListener(null);
  }, [crop, initialCrop, scale, translateX, translateY]);

  // Fit image to screen width so the full width is visible; pinch can zoom out further.
  const baseLayout = useMemo(() => {
    if (!imageSize) return null;
    const width = screenW;
    const height = (imageSize.height / imageSize.width) * screenW;
    return {
      width,
      height,
      naturalWidth: imageSize.width,
      naturalHeight: imageSize.height,
    };
  }, [imageSize, screenW]);

  useEffect(() => {
    if (!baseLayout) return;
    baseW.value = baseLayout.width;
    baseH.value = baseLayout.height;
    translateX.value = 0;
    translateY.value = 0;
    // Start at width-fit (1). If the image is shorter than the crop circle, scale up just enough to fill it.
    const fillCircle = Math.max(crop.value / baseLayout.width, crop.value / baseLayout.height);
    scale.value = Math.max(1, fillCircle);
  }, [baseH, baseLayout, baseW, crop, scale, translateX, translateY]);

  const clampPanFor = (nextScale: number, nextCrop: number) => {
    'worklet';
    const maxX = Math.max(0, (baseW.value * nextScale - nextCrop) / 2);
    const maxY = Math.max(0, (baseH.value * nextScale - nextCrop) / 2);
    translateX.value = clamp(translateX.value, -maxX, maxX);
    translateY.value = clamp(translateY.value, -maxY, maxY);
  };

  const minZoomForCrop = (nextCrop: number) => {
    'worklet';
    // Allow zooming out until the whole photo fits inside the circle (and a bit smaller).
    const fitInside = Math.min(nextCrop / baseW.value, nextCrop / baseH.value);
    return Math.max(0.15, fitInside * 0.75);
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxX = Math.max(0, (baseW.value * scale.value - crop.value) / 2);
      const maxY = Math.max(0, (baseH.value * scale.value - crop.value) / 2);
      translateX.value = clamp(startX.value + event.translationX, -maxX, maxX);
      translateY.value = clamp(startY.value + event.translationY, -maxY, maxY);
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(
        startScale.value * event.scale,
        minZoomForCrop(crop.value),
        5,
      );
      scale.value = nextScale;
      clampPanFor(nextScale, crop.value);
    });

  const imageGestures = Gesture.Simultaneous(panGesture, pinchGesture);

  const resizeTl = Gesture.Pan()
    .onBegin(() => {
      startCrop.value = crop.value;
    })
    .onUpdate((event) => {
      const next = clamp(
        startCrop.value + (-event.translationX - event.translationY),
        minCropSV.value,
        maxCropSV.value,
      );
      crop.value = next;
      const minZ = minZoomForCrop(next);
      if (scale.value < minZ) scale.value = minZ;
      clampPanFor(scale.value, next);
      runOnJS(syncCropSize)(next);
    });

  const resizeTr = Gesture.Pan()
    .onBegin(() => {
      startCrop.value = crop.value;
    })
    .onUpdate((event) => {
      const next = clamp(
        startCrop.value + (event.translationX - event.translationY),
        minCropSV.value,
        maxCropSV.value,
      );
      crop.value = next;
      const minZ = minZoomForCrop(next);
      if (scale.value < minZ) scale.value = minZ;
      clampPanFor(scale.value, next);
      runOnJS(syncCropSize)(next);
    });

  const resizeBl = Gesture.Pan()
    .onBegin(() => {
      startCrop.value = crop.value;
    })
    .onUpdate((event) => {
      const next = clamp(
        startCrop.value + (-event.translationX + event.translationY),
        minCropSV.value,
        maxCropSV.value,
      );
      crop.value = next;
      const minZ = minZoomForCrop(next);
      if (scale.value < minZ) scale.value = minZ;
      clampPanFor(scale.value, next);
      runOnJS(syncCropSize)(next);
    });

  const resizeBr = Gesture.Pan()
    .onBegin(() => {
      startCrop.value = crop.value;
    })
    .onUpdate((event) => {
      const next = clamp(
        startCrop.value + (event.translationX + event.translationY),
        minCropSV.value,
        maxCropSV.value,
      );
      crop.value = next;
      const minZ = minZoomForCrop(next);
      if (scale.value < minZ) scale.value = minZ;
      clampPanFor(scale.value, next);
      runOnJS(syncCropSize)(next);
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const closeWith = (result: string | null) => {
    setSession(null);
    setImageSize(null);
    setSaving(false);
    setRotating(false);
    completeCircularImageCrop(result);
  };

  const handleCancel = () => {
    if (saving || rotating) return;
    closeWith(null);
  };

  const handleRotate = async () => {
    if (!session || saving || rotating) return;
    setRotating(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        session.uri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      setImageSize(null);
      setSession({ uri: result.uri });
      Image.getSize(
        result.uri,
        (width, height) => setImageSize({ width, height }),
        () => setImageSize({ width: 1024, height: 1024 }),
      );
    } catch {
      // Keep current image if rotate fails.
    } finally {
      setRotating(false);
    }
  };

  const handleCrop = async () => {
    if (!session || !baseLayout || saving || rotating) return;

    setSaving(true);

    const currentScale = scale.value;
    const currentX = translateX.value;
    const currentY = translateY.value;
    const currentCrop = crop.value;

    const scaledW = baseLayout.width * currentScale;
    const scaledH = baseLayout.height * currentScale;
    const imgLeft = screenW / 2 + currentX - scaledW / 2;
    const imgTop = screenH / 2 + currentY - scaledH / 2;

    const circleLeft = (screenW - currentCrop) / 2;
    const circleTop = (screenH - currentCrop) / 2;

    let originX = ((circleLeft - imgLeft) / scaledW) * baseLayout.naturalWidth;
    let originY = ((circleTop - imgTop) / scaledH) * baseLayout.naturalHeight;
    let cropW = (currentCrop / scaledW) * baseLayout.naturalWidth;
    let cropH = (currentCrop / scaledH) * baseLayout.naturalHeight;

    originX = Math.max(0, Math.min(originX, baseLayout.naturalWidth - 1));
    originY = Math.max(0, Math.min(originY, baseLayout.naturalHeight - 1));
    cropW = Math.max(1, Math.min(cropW, baseLayout.naturalWidth - originX));
    cropH = Math.max(1, Math.min(cropH, baseLayout.naturalHeight - originY));

    const side = Math.min(cropW, cropH);
    cropW = side;
    cropH = side;

    try {
      const result = await ImageManipulator.manipulateAsync(
        session.uri,
        [
          {
            crop: {
              originX: Math.round(originX),
              originY: Math.round(originY),
              width: Math.round(cropW),
              height: Math.round(cropH),
            },
          },
          { resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      closeWith(result.uri);
    } catch {
      setSaving(false);
      closeWith(null);
    }
  };

  const cx = screenW / 2;
  const cy = screenH / 2;
  const radius = cropSize / 2;
  const boxLeft = cx - radius;
  const boxTop = cy - radius;
  const hit = 44;

  const corners = [
    { key: 'tl', left: boxLeft, top: boxTop, gesture: resizeTl },
    { key: 'tr', left: boxLeft + cropSize, top: boxTop, gesture: resizeTr },
    { key: 'bl', left: boxLeft, top: boxTop + cropSize, gesture: resizeBl },
    { key: 'br', left: boxLeft + cropSize, top: boxTop + cropSize, gesture: resizeBr },
  ] as const;

  return (
    <Modal
      visible={Boolean(session)}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
      supportedOrientations={['portrait']}
      statusBarTranslucent
      transparent={false}
    >
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" translucent backgroundColor="transparent" />

        <View style={styles.stage}>
          {session && baseLayout ? (
            <GestureDetector gesture={imageGestures}>
              <Animated.View
                style={[
                  styles.imageWrap,
                  {
                    left: screenW / 2,
                    top: screenH / 2,
                    width: baseLayout.width,
                    height: baseLayout.height,
                    marginLeft: -baseLayout.width / 2,
                    marginTop: -baseLayout.height / 2,
                  },
                  imageStyle,
                ]}
              >
                <Image
                  source={{ uri: session.uri }}
                  style={{ width: baseLayout.width, height: baseLayout.height }}
                  resizeMode="stretch"
                />
              </Animated.View>
            </GestureDetector>
          ) : (
            <ActivityIndicator color={WHITE} size="large" />
          )}

          {/* Dimmed overlay + circular crop window */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={screenW} height={screenH}>
              <Defs>
                <Mask id="circleMask">
                  <Rect width={screenW} height={screenH} fill="#FFFFFF" />
                  <Circle cx={cx} cy={cy} r={radius} fill="#000000" />
                </Mask>
              </Defs>
              <Rect width={screenW} height={screenH} fill={OVERLAY} mask="url(#circleMask)" />
              <Circle
                cx={cx}
                cy={cy}
                r={radius}
                stroke={WHITE}
                strokeWidth={2}
                strokeDasharray="6 5"
                fill="transparent"
              />
              <Rect
                x={boxLeft}
                y={boxTop}
                width={cropSize}
                height={cropSize}
                stroke="rgba(255,255,255,0.28)"
                strokeWidth={1}
                fill="transparent"
              />
            </Svg>
          </View>

          {/* Draggable corner handles — resize the circle */}
          {corners.map(({ key, left, top, gesture }) => (
            <GestureDetector key={key} gesture={gesture}>
              <Animated.View
                style={[
                  styles.handleHit,
                  {
                    left: left - hit / 2,
                    top: top - hit / 2,
                    width: hit,
                    height: hit,
                  },
                ]}
              >
                <View style={styles.handle} />
              </Animated.View>
            </GestureDetector>
          ))}
        </View>

        {/* Transparent toolbar — white icons/text only */}
        <View style={[styles.toolbar, { paddingTop: Math.max(insets.top, 10) }]} pointerEvents="box-none">
          <Pressable
            onPress={handleCancel}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            disabled={saving}
            style={styles.toolbarBtn}
          >
            <Ionicons name="arrow-back" size={normalize(26)} color={WHITE} />
          </Pressable>

          <View style={styles.toolbarRight}>
            <Pressable
              onPress={() => {
                void handleRotate();
              }}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Rotate"
              disabled={saving || rotating}
              style={styles.toolbarBtn}
            >
              {rotating ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <Ionicons name="refresh" size={normalize(24)} color={WHITE} />
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                void handleCrop();
              }}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Crop"
              disabled={saving || rotating || !baseLayout}
              style={styles.cropBtn}
            >
              {saving ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <AppText color={WHITE} style={styles.cropAction}>
                  CROP
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  stage: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'absolute',
  },
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 12,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft shadow so white icons stay readable on bright photos
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  cropBtn: {
    minWidth: 68,
    height: 48,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  cropAction: {
    fontSize: normalize(16),
    fontFamily: 'Saveful-Bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  handleHit: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  handle: {
    width: HANDLE,
    height: HANDLE,
    backgroundColor: WHITE,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
});
