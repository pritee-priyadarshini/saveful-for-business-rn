type CropRequest = {
  uri: string;
  resolve: (uri: string | null) => void;
};

type CropListener = (request: CropRequest | null) => void;

let listener: CropListener | null = null;
let pending: CropRequest | null = null;

export function registerCircularCropListener(next: CropListener | null) {
  listener = next;
  if (listener && pending) {
    listener(pending);
  }
}

/**
 * Shows the in-app circular crop UI and resolves with the cropped URI (or null if cancelled).
 */
export function openCircularImageCrop(uri: string): Promise<string | null> {
  return new Promise((resolve) => {
    const request: CropRequest = {
      uri,
      resolve: (result) => {
        pending = null;
        resolve(result);
      },
    };

    pending = request;

    if (listener) {
      listener(request);
    }
  });
}

export function completeCircularImageCrop(result: string | null) {
  if (!pending) return;
  const { resolve } = pending;
  pending = null;
  listener?.(null);
  resolve(result);
}
