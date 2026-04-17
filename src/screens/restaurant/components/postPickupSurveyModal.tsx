import React, { useState } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Pressable,
    Image,
    TextInput,
    ScrollView,
} from 'react-native';
import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Ionicons } from '@expo/vector-icons';

type Item = {
    id: string;
    name: string;
    quantity: number;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    onComplete: (id: string, status: 'completed' | 'cancelled') => void;
    selectedId: string | null;
    items?: Item[];
};

export function PostPickupSurveyModal({
    visible,
    onClose,
    onComplete,
    selectedId,
    items = [
        { id: '1', name: 'Rice Meals', quantity: 5 },
        { id: '2', name: 'Bread Packs', quantity: 3 },
    ],
}: Props) {
    const [step, setStep] = useState(1);
    const [isPartial, setIsPartial] = useState(false);
    const [updatedItems, setUpdatedItems] = useState(items);
    const [reason, setReason] = useState('');
    const [otherReason, setOtherReason] = useState('');

    const totalKg = updatedItems.reduce((sum, i) => sum + i.quantity, 0);

    const updateQty = (id: string, delta: number) => {
        setUpdatedItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                    : item
            )
        );
    };

    const reset = () => {
        setStep(1);
        setIsPartial(false);
        setUpdatedItems(items);
        setReason('');
        setOtherReason('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const reasons = [
        'No show',
        'Delayed pickup',
        'Quality issue',
        'Cancelled',
        'Other',
    ];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.closeRow}>
                        <Pressable onPress={handleClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={palette.black} />
                        </Pressable>
                    </View>
                    <ScrollView
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >

                        {/* STEP 1 */}
                        {step === 1 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.icon}
                                />
                                <AppText style={styles.title}>Pickup Completed?</AppText>

                                <View style={styles.row}>
                                    <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
                                        <AppText style={styles.primaryText}>Yes</AppText>
                                    </Pressable>

                                    <Pressable style={styles.secondaryBtn} onPress={() => setStep(5)}>
                                        <AppText>No</AppText>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.icon}
                                />
                                <AppText style={styles.title}>Was everything collected?</AppText>

                                <View style={styles.row}>
                                    <Pressable style={styles.primaryBtn} onPress={() => setStep(4)}>
                                        <AppText style={styles.primaryText}>Full</AppText>
                                    </Pressable>

                                    <Pressable
                                        style={styles.secondaryBtn}
                                        onPress={() => {
                                            setIsPartial(true);
                                            setStep(3);
                                        }}
                                    >
                                        <AppText>Partial</AppText>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.icon}
                                />
                                <AppText style={styles.title}>Adjust collected items</AppText>

                                {updatedItems.map((item) => (
                                    <View key={item.id} style={styles.itemRow}>
                                        <AppText>{item.name}</AppText>

                                        <View style={styles.counter}>
                                            <Pressable onPress={() => updateQty(item.id, -1)}>
                                                <Ionicons name="remove" size={18} />
                                            </Pressable>

                                            <AppText>{item.quantity} kg</AppText>

                                            <Pressable onPress={() => updateQty(item.id, 1)}>
                                                <Ionicons name="add" size={18} />
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}

                                <AppText style={styles.total}>Total: {totalKg} kg</AppText>

                                <Pressable style={styles.primaryBtn} onPress={() => setStep(4)}>
                                    <AppText style={styles.primaryText}>Confirm</AppText>
                                </Pressable>
                            </>
                        )}

                        {/* STEP 4 */}
                        {step === 4 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.icon}
                                />
                                <AppText style={styles.title}>🙌 Nice one!</AppText>

                                <AppText style={styles.success}>
                                    You’ve saved {totalKg} kg of food and supported your community.
                                </AppText>

                                <Pressable
                                    style={styles.primaryBtn}
                                    onPress={() => {
                                        onComplete?.(selectedId!, 'completed');
                                        handleClose();
                                    }}
                                >
                                    <AppText style={styles.primaryText}>Go Home</AppText>
                                </Pressable>
                            </>
                        )}

                        {/* STEP 5 - RADIO UI */}
                        {step === 5 && (
                            <>

                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.icon}
                                />
                                <AppText style={styles.title}>Reason for not Collecting</AppText>

                                {reasons.map((r) => {
                                    const isSelected = reason === r;

                                    return (
                                        <Pressable
                                            key={r}
                                            style={styles.radioRow}
                                            onPress={() => setReason(r)}
                                        >
                                            <View style={styles.radioOuter}>
                                                {isSelected && <View style={styles.radioInner} />}
                                            </View>

                                            <AppText>{r}</AppText>
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

                                <Pressable style={styles.primaryBtn} onPress={() => setStep(6)}>
                                    <AppText style={styles.primaryText}>Submit</AppText>
                                </Pressable>
                            </>
                        )}

                        {/* STEP 6 */}
                        {step === 6 && (
                            <>
                                <Image
                                    source={require('../../../../assets/placeholder/bowl.png')}
                                    style={styles.icon}
                                />
                                <AppText style={styles.title}>🙏 Thank you</AppText>

                                <AppText style={styles.success}>
                                    You played an important role in saving meals today.
                                </AppText>

                                <Pressable
                                    style={styles.primaryBtn}
                                    onPress={() => {
                                        onComplete?.(selectedId!, 'cancelled');
                                        handleClose();
                                    }}
                                >
                                    <AppText style={styles.primaryText}>Go to Home</AppText>
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
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    card: {
        width: '85%',
        maxHeight: '90%',
        borderRadius: 24,
        paddingTop: spacing.xxl,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        backgroundColor: palette.white,
    },
    closeRow: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
    },

    closeBtn: {
        padding: 6,
    },

    content: {
        paddingBottom: spacing.md,
    },

    icon: {
        width: 200,
        height: 150,
        resizeMode: 'contain',
        alignSelf: 'center',
        marginBottom: spacing.sm,
    },

    title: {
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 18,
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
        marginTop: spacing.md,
    },

    primaryBtn: {
        flex: 1,
        backgroundColor: palette.primary,
        padding: spacing.sm,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: spacing.md,
        minHeight: 40,
    },

    secondaryBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: palette.strokecream,
        padding: spacing.sm,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: spacing.md,
        minHeight: 40,
    },

    primaryText: {
        color: palette.white,
        fontWeight: '600',
    },

    itemRow: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    counter: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
    },

    total: {
        marginTop: spacing.sm,
        fontWeight: '700',
        textAlign: 'center',
    },

    success: {
        marginTop: spacing.sm,
        textAlign: 'center',
        lineHeight: 20,
    },

    input: {
        borderWidth: 1,
        borderColor: palette.strokecream,
        borderRadius: 10,
        padding: spacing.sm,
        marginTop: spacing.sm,
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
        borderRadius: 4,
        backgroundColor: palette.primary,
    },
});