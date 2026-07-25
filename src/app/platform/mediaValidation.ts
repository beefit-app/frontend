const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;

export async function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Use uma imagem JPEG, PNG ou WebP.");
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("A imagem deve ter no máximo 8 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
      image.src = objectUrl;
    });
    if (image.naturalWidth > MAX_IMAGE_DIMENSION || image.naturalHeight > MAX_IMAGE_DIMENSION) {
      throw new Error("A imagem deve ter no máximo 4096 px em cada dimensão.");
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function revokeObjectUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}
