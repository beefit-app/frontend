import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

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

function toBase64(file: File) {
  return file.arrayBuffer().then((buffer) => {
    let binary = "";
    new Uint8Array(buffer).forEach((value) => { binary += String.fromCharCode(value); });
    return btoa(binary);
  });
}

export async function persistWorkoutPhoto(file: File): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const path = `workout-drafts/${crypto.randomUUID()}-${file.name || "photo.jpg"}`;
  await Filesystem.writeFile({ path, data: await toBase64(file), directory: Directory.Data, recursive: true });
  return path;
}

export async function restoreWorkoutPhoto(path: string): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data });
    if (typeof result.data !== "string") return null;
    const bytes = Uint8Array.from(atob(result.data), (character) => character.charCodeAt(0));
    return new File([bytes], path.split("/").pop() ?? "photo.jpg", { type: "image/jpeg" });
  } catch { return null; }
}

export async function removePersistedWorkoutPhoto(path: string | null | undefined) {
  if (!path || !Capacitor.isNativePlatform()) return;
  try { await Filesystem.deleteFile({ path, directory: Directory.Data }); } catch { /* already absent */ }
}
