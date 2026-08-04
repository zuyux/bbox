const APP_ICON_SIZE = 512;

/** Center-crops an image and converts it to a consistent 512×512 PNG app icon. */
export async function processAppIcon(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('The selected image could not be processed.'));
      element.src = objectUrl;
    });

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    if (!sourceSize) throw new Error('The selected image has invalid dimensions.');

    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = APP_ICON_SIZE;
    canvas.height = APP_ICON_SIZE;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is not supported by this browser.');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      APP_ICON_SIZE,
      APP_ICON_SIZE,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('The processed icon could not be encoded.')),
        'image/png',
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'app-icon';
    return new File([blob], `${baseName}-512.png`, { type: 'image/png', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
