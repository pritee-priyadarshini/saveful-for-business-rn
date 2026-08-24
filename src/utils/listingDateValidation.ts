export type ListingDateFieldErrors = {
  bestBefore?: string;
  pickupFrom?: string;
  pickupTo?: string;
};

export const PAST_COLLECTION_WINDOW_MESSAGE =
  "You can't set up a collection window in the past. Choose a pickup window that hasn't ended yet.";

/** Strip time — best-before is a calendar date, pickup times include hours. */
function calendarDayMs(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function isOnOrBeforeBestBeforeDay(value: Date, bestBefore: Date): boolean {
  return calendarDayMs(value) <= calendarDayMs(bestBefore);
}

export function getListingFoodItemsError(totalQty: number): string | undefined {
  if (totalQty <= 0) {
    return 'Add at least one food item with quantity greater than 0.';
  }
  return undefined;
}

export function getListingDateErrors(
  bestBefore: Date | null,
  pickupFrom: Date | null,
  pickupTo: Date | null,
  now: Date = new Date(),
): ListingDateFieldErrors {
  const errors: ListingDateFieldErrors = {};

  if (!bestBefore) {
    errors.bestBefore = 'Please select a best before date.';
  }
  if (!pickupFrom) {
    errors.pickupFrom = 'Please select a pickup start time.';
  }
  if (!pickupTo) {
    errors.pickupTo = 'Please select a pickup end time.';
  }

  if (pickupFrom && pickupTo && pickupTo <= pickupFrom) {
    errors.pickupTo = 'Pickup end time must be after pickup start time.';
  }

  if (bestBefore) {
    if (pickupFrom && !isOnOrBeforeBestBeforeDay(pickupFrom, bestBefore)) {
      errors.pickupFrom = 'Pickup start must be on or before the best before date.';
    }
    if (pickupTo && !isOnOrBeforeBestBeforeDay(pickupTo, bestBefore)) {
      errors.pickupTo = 'Pickup end must be on or before the best before date.';
    }
  }

  if (pickupTo && pickupTo.getTime() <= now.getTime()) {
    errors.pickupTo = PAST_COLLECTION_WINDOW_MESSAGE;
  }

  return errors;
}

export function hasListingDateErrors(errors: ListingDateFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
