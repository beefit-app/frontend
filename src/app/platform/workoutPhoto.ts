import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [metadata, content] = dataUrl.split(",");
  const mime = metadata.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = Uint8Array.from(atob(content), (character) => character.charCodeAt(0));
  return new File([bytes], fileName, { type: mime });
}

export async function captureWorkoutPhoto(source: CameraSource): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const photo = await Camera.getPhoto({
    source,
    resultType: CameraResultType.DataUrl,
    quality: 85,
    correctOrientation: true,
  });
  return photo.dataUrl ? dataUrlToFile(photo.dataUrl, `workout-${Date.now()}.jpg`) : null;
}
