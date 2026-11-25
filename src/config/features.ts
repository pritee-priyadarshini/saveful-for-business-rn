import { MFC_PREVIEW } from '@/dev/previewFlag';

/**
 * Make Food Count ships in the app but stays hidden until launch.
 *
 * To launch it: set MAKE_FOOD_COUNT_LAUNCHED to true and publish an update
 * (`eas update --channel production`). 2.0.0 builds pick it up on their next
 * restart, and "What's new" opens once more, now announcing Make Food Count too.
 *
 * While false, nothing leads to it: no Home or Sites card, no Food Impact links,
 * no What's new slide, and Home does not call its endpoints.
 * EXPO_PUBLIC_MFC_ENABLED=1 turns it on for a local build.
 */
const MAKE_FOOD_COUNT_LAUNCHED = true;

export const MFC_ENABLED =
  MAKE_FOOD_COUNT_LAUNCHED || MFC_PREVIEW || process.env.EXPO_PUBLIC_MFC_ENABLED === '1';

/**
 * Plans are sold on the Saveful website, not in the app (App Store / Play
 * in-app purchase rules). While false, nothing in the app opens the plans,
 * confirm or checkout screens, and module upsells only explain — no buy button
 * or link. The plans screens stay built and registered for when this changes.
 */
export const IN_APP_PLANS_ENABLED = false;
