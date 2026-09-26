export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export function calculateTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: Math.max(1, maxWidth), height: Math.max(1, maxHeight) };
  }

  let width = srcWidth;
  let height = srcHeight;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Redimensiona e comprime um arquivo de imagem no cliente usando HTML Canvas.
 *
 * @param file Arquivo de imagem original
 * @param options Opções de largura/altura máximas, qualidade (0 a 1) e tipo MIME
 * @returns Promessa com o arquivo comprimido (ou o original em caso de falha/incompatibilidade)
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    mimeType = "image/jpeg",
  } = options;

  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return file;
  }

  if (!file.type.startsWith("image/") || file.type.includes("svg")) {
    return file;
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImage(objectUrl);
      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;

      const { width, height } = calculateTargetDimensions(
        naturalWidth,
        naturalHeight,
        maxWidth,
        maxHeight,
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return file;
      }

      if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, mimeType, quality);
      });

      if (!blob) {
        return file;
      }

      const outputExtension =
        mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const baseName = file.name.replace(/\.[^/.]+$/, "") || "photo";
      const newFileName = `${baseName}.${outputExtension}`;

      return new File([blob], newFileName, {
        type: mimeType,
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    console.warn("Falha ao comprimir imagem no cliente, mantendo original:", error);
    return file;
  }
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropOptions {
  width: number;
  height: number;
  quality?: number;
}

/**
 * Recorta a área escolhida (em pixels da imagem original) e a entrega já no
 * tamanho final, em JPEG.
 *
 * Diferente de compressImageFile, falhar aqui lança erro em vez de devolver o
 * original: salvar a foto inteira ignoraria o enquadramento que o usuário escolheu.
 */
export async function cropImageFile(file: File, area: CropArea, options: ImageCropOptions): Promise<File> {
  const { width, height, quality = 0.8 } = options;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Não foi possível recortar a imagem neste dispositivo.");
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) {
      throw new Error("Não foi possível recortar a imagem neste dispositivo.");
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
