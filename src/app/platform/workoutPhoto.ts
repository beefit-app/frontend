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
  try {
    const check = await Camera.checkPermissions();
    if (source === CameraSource.Camera && check.camera !== "granted") {
      const requested = await Camera.requestPermissions({ permissions: ["camera"] });
      if (requested.camera !== "granted") {
        return null;
      }
    } else if (source === CameraSource.Photos && check.photos !== "granted") {
      const requested = await Camera.requestPermissions({ permissions: ["photos"] });
      if (requested.photos !== "granted") {
        return null;
      }
    }

    const photo = await Camera.getPhoto({
      source,
      resultType: CameraResultType.DataUrl,
      quality: 85,
      correctOrientation: true,
    });
    return photo.dataUrl ? dataUrlToFile(photo.dataUrl, `workout-${Date.now()}.jpg`) : null;
  } catch {
    return null;
  }
}

function toBase64(file: File) {
  return file.arrayBuffer().then((buffer) => {
    let binary = "";
    new Uint8Array(buffer).forEach((value) => { binary += String.fromCharCode(value); });
    return btoa(binary);
  });
}

export async function persistWorkoutPhoto(file: File): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof indexedDB === "undefined") return null;
    const key = `web:${crypto.randomUUID()}:${file.name || "photo.jpg"}`;
    await withWebPhotoStore("readwrite", (store) => store.put(file, key));
    return key;
  }
  const path = `workout-drafts/${crypto.randomUUID()}-${file.name || "photo.jpg"}`;
  await Filesystem.writeFile({ path, data: await toBase64(file), directory: Directory.Data, recursive: true });
  return path;
}

export async function restoreWorkoutPhoto(path: string): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) {
    if (!path.startsWith("web:") || typeof indexedDB === "undefined") return null;
    const blob = await withWebPhotoStore<Blob | undefined>("readonly", (store) => store.get(path));
    return blob ? new File([blob], path.split(":").pop() ?? "photo.jpg", { type: blob.type || "image/jpeg" }) : null;
  }
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data });
    if (typeof result.data !== "string") return null;
    const bytes = Uint8Array.from(atob(result.data), (character) => character.charCodeAt(0));
    return new File([bytes], path.split("/").pop() ?? "photo.jpg", { type: "image/jpeg" });
  } catch { return null; }
}

export async function removePersistedWorkoutPhoto(path: string | null | undefined) {
  if (!path) return;
  if (!Capacitor.isNativePlatform()) {
    if (path.startsWith("web:") && typeof indexedDB !== "undefined") {
      await withWebPhotoStore("readwrite", (store) => store.delete(path));
    }
    return;
  }
  try { await Filesystem.deleteFile({ path, directory: Directory.Data }); } catch { /* already absent */ }
}

function withWebPhotoStore<T = IDBValidKey>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open("beefit-workout-drafts", 1);
    openRequest.onupgradeneeded = () => openRequest.result.createObjectStore("photos");
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const transaction = database.transaction("photos", mode);
      const request = operation(transaction.objectStore("photos"));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    };
  });
}
