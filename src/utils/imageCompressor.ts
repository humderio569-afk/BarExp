/**
 * Image compression utility to ensure product photos and avatar images
 * fit reliably within Firestore document size constraints (1MB max document limit)
 * and load instantly on POS / mobile screens.
 */

export async function compressImageFile(
  file: File,
  maxWidth = 500,
  maxHeight = 500,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio preserving dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original raw dataUrl
          resolve(event.target?.result as string);
          return;
        }

        // Draw image resized
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP or JPEG
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          resolve(event.target?.result as string);
        }
      };

      img.onerror = () => {
        reject(new Error('Erreur lors du décodage de l’image.'));
      };

      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      } else {
        reject(new Error('Lecture du fichier impossible.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur de lecture du fichier image.'));
    };

    reader.readAsDataURL(file);
  });
}
