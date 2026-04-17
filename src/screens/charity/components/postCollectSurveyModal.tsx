import React, { useState } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Pressable,
    ScrollView,
    TextInput,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Item = {
    id: string;
    name: string;
    quantity: number;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    initialAnswer?: 'yes' | 'no' | null;
};

export function PostCollectSurveyModal({ visible, onClose, initialAnswer }: Props) {
    const [step, setStep] = useState(1);
    const [isPartial, setIsPartial] = useState(false);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const [reason, setReason] = useState('');
    const [otherReason, setOtherReason] = useState('');

    const [items, setItems] = useState<Item[]>([
        { id: '1', name: 'Rice Meals', quantity: 5 },
        { id: '2', name: 'Bread Packs', quantity: 3 },
    ]);

    React.useEffect(() => {
        if (initialAnswer === 'yes') setStep(2);
        if (initialAnswer === 'no') setStep(6);
    }, [initialAnswer]);

    const totalKg = items.reduce((sum, i) => sum + i.quantity, 0);

    const updateQty = (id: string, delta: number) => {
        setItems((prev) =>
            prev.map((i) =>
                i.id === id
                    ? { ...i, quantity: Math.max(0, i.quantity + delta) }
                    : i
            )
        );
    };

    const reset = () => {
        setStep(1);
        setRating(0);
        setComment('');
        setReason('');
        setOtherReason('');
        setIsPartial(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const reasons = [
        'Pickup expired',
        'Location issue',
        'Food unavailable',
        'Too far',
        'Other',
    ];

    const canSubmitRating = rating > 0;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Pressable style={styles.closeIcon} onPress={handleClose}>
                        <Ionicons name="close" size={22} color={palette.black} />
                    </Pressable>
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* STEP 1 - Collection Confirmation */}
                        {step === 1 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.questionIcon}
                                />
                                <AppText variant='label' style={styles.title}>Did you collect the food?</AppText>

                                <View style={styles.row}>
                                    <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
                                        <AppText variant='label' style={styles.primaryText}>Yes</AppText>
                                    </Pressable>

                                    <Pressable style={styles.secondaryBtn} onPress={() => setStep(6)}>
                                        <AppText variant='label'>No</AppText>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {/* STEP 2 - Full or Partial Claim */}
                        {step === 2 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.questionIcon}
                                />
                                <AppText variant='subheading' style={styles.title}>Was it full or partial?</AppText>

                                <View style={styles.row}>
                                    <Pressable style={styles.primaryBtn} onPress={() => setStep(4)}>
                                        <AppText variant='label' style={styles.primaryText}>Full</AppText>
                                    </Pressable>

                                    <Pressable
                                        style={styles.secondaryBtn}
                                        onPress={() => {
                                            setIsPartial(true);
                                            setStep(3);
                                        }}
                                    >
                                        <AppText variant='label'>Partial</AppText>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {/* STEP 3 - If Partial */}
                        {step === 3 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.questionIcon}
                                />
                                <AppText variant='subheading' style={styles.title}>Adjust collected items</AppText>

                                {items.map((item) => (
                                    <View key={item.id} style={styles.itemRow}>
                                        <AppText variant='bodySmall'>{item.name}</AppText>

                                        <View style={styles.counter}>
                                            <Pressable onPress={() => updateQty(item.id, -1)}>
                                                <Ionicons name="remove" size={18} />
                                            </Pressable>

                                            <AppText variant='label'>{item.quantity} kg</AppText>

                                            <Pressable onPress={() => updateQty(item.id, 1)}>
                                                <Ionicons name="add" size={18} />
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}

                                <AppText variant='label' style={styles.total}>Total: {totalKg} kg</AppText>

                                <Pressable style={styles.primaryBtn} onPress={() => setStep(4)}>
                                    <AppText variant='label' style={styles.primaryText}>Continue</AppText>
                                </Pressable>
                            </>
                        )}

                        {/* STEP 4 - Rating */}
                        {step === 4 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.questionIcon}
                                />
                                <AppText variant='subheading' style={styles.title}>How much will you rate the surplus?</AppText>

                                <View style={styles.ratingRow}>
                                    {[1, 2, 3, 4, 5].map((num) => {
                                        const selected = rating >= num;

                                        return (
                                            <Pressable key={num} onPress={() => setRating(num)}>
                                                <View style={styles.appleWrapper}>
                                                    <AppText
                                                        style={[
                                                            styles.apple,
                                                            selected && styles.appleSelected,
                                                        ]}
                                                    >
                                                        🍎
                                                    </AppText>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <TextInput
                                    placeholder="Add comments (optional)"
                                    value={comment}
                                    onChangeText={setComment}
                                    style={styles.input}
                                />

                                <Pressable
                                    style={[
                                        styles.primaryBtn,
                                        !canSubmitRating && { opacity: 0.5 },
                                    ]}
                                    disabled={!canSubmitRating}
                                    onPress={() => setStep(5)}
                                >
                                    <AppText variant='label' style={styles.primaryText}>Submit</AppText>
                                </Pressable>
                            </>
                        )}

                        {/* STEP 5 - Success */}
                        {step === 5 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.questionIcon}
                                />
                                <AppText variant='subheading' style={styles.title}>🌍 You made a difference</AppText>

                                <AppText variant='bodyLarge' style={styles.success}>
                                    You helped reduce food waste and supported your community today.
                                </AppText>

                                <Pressable style={styles.primaryBtn} onPress={handleClose}>
                                    <AppText variant='label' style={styles.primaryText}>Go Home</AppText>
                                </Pressable>
                            </>
                        )}

                        {/* STEP 6 - If not collected */}
                        {step === 6 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.questionIcon}
                                />
                                <AppText variant='subheading' style={styles.title}>Reason for Not Collecting</AppText>

                                {reasons.map((r) => {
                                    const selected = reason === r;

                                    return (
                                        <Pressable
                                            key={r}
                                            style={styles.radioRow}
                                            onPress={() => setReason(r)}
                                        >
                                            <View style={styles.radioOuter}>
                                                {selected && <View style={styles.radioInner} />}
                                            </View>
                                            <AppText variant='bodyLarge'>{r}</AppText>
                                        </Pressable>
                                    );
                                })}

                                {reason === 'Other' && (
                                    <TextInput
                                        placeholder="Please specify"
                                        value={otherReason}
                                        onChangeText={setOtherReason}
                                        style={styles.input}
                                    />
                                )}

                                <Pressable style={styles.primaryBtn} onPress={() => setStep(7)}>
                                    <AppText variant='label' style={styles.primaryText}>Submit</AppText>
                                </Pressable>
                            </>
                        )}

                        {/* STEP 7 */}
                        {step === 7 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.questionIcon}
                                />
                                <AppText variant='subheading' style={styles.title}>🙏 You tried to help</AppText>

                                <AppText variant='bodyLarge' style={styles.success}>
                                    Keep looking for new listings and continue making an impact.
                                </AppText>

                                <Pressable style={styles.primaryBtn} onPress={handleClose}>
                                    <AppText variant='label' style={styles.primaryText}>Go Home</AppText>
                                </Pressable>
                            </>
                        )}

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    card: {
        width: '92%',
        maxHeight: '90%',
        backgroundColor: palette.white,
        borderRadius: 20,
        padding: spacing.lg,
    },

    content: {
        paddingBottom: spacing.md,
    },

    title: {
        textAlign: 'center',
    },

    row: {
        flexDirection: 'row',
        marginTop: spacing.md,
    },
    closeIcon: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        zIndex: 10,
    },

    questionIcon: {
        width: 150,
        height: 150,
        alignSelf: 'center',
        marginBottom: spacing.md,
        resizeMode: 'contain',
    },

    primaryBtn: {
        flex: 1,
        backgroundColor: palette.primary,
        padding: spacing.sm,
        borderRadius: 10,
        alignItems: 'center',
        marginRight: spacing.sm,
        marginTop: spacing.md,
    },

    secondaryBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: palette.strokecream,
        padding: spacing.sm,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: spacing.md,
    },

    primaryText: {
        color: palette.white,
    },

    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
    },

    input: {
        borderWidth: 1,
        borderColor: palette.strokecream,
        borderRadius: 10,
        padding: spacing.sm,
        marginTop: spacing.sm,
    },

    success: {
        marginTop: spacing.sm,
        textAlign: 'center',
    },

    itemRow: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    counter: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    total: {
        marginTop: spacing.sm,
        textAlign: 'center',
    },

    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },

    radioOuter: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: palette.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },

    radioInner: {
        width: 8,
        height: 8,
        backgroundColor: palette.primary,
        borderRadius: 4,
    },

    appleWrapper: {
        padding: 6,
        borderRadius: 8,
    },

    apple: {
        fontSize: 32,
        lineHeight: 36,
        opacity: 0.3,
    },

    appleSelected: {
        opacity: 1,
        transform: [{ scale: 1.2 }],

    },
});