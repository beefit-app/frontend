import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  calculateTargetDimensions,
  compressImageFile,
} from "./imageCompression";

describe("calculateTargetDimensions", () => {
  it("keeps original dimensions when they are within limits", () => {
    const result = calculateTargetDimensions(800, 600, 1200, 1200);
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it("scales down proportionally when width exceeds maxWidth", () => {
    const result = calculateTargetDimensions(2400, 1600, 1200, 1200);
    expect(result).toEqual({ width: 1200, height: 800 });
  });

  it("scales down proportionally when height exceeds maxHeight", () => {
    const result = calculateTargetDimensions(1600, 2400, 1200, 1200);
    expect(result).toEqual({ width: 800, height: 1200 });
  });

  it("scales down square images correctly", () => {
    const result = calculateTargetDimensions(3000, 3000, 1200, 1200);
    expect(result).toEqual({ width: 1200, height: 1200 });
  });

  it("scales down avatar dimensions to 512x512", () => {
    const result = calculateTargetDimensions(1080, 1920, 512, 512);
    expect(result.height).toBe(512);
    expect(result.width).toBe(Math.round((1080 * 512) / 1920));
  });

  it("handles zero or negative dimensions safely", () => {
    const result = calculateTargetDimensions(0, 0, 1200, 1200);
    expect(result).toEqual({ width: 1200, height: 1200 });
  });
});

describe("compressImageFile", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("returns original file if mime type is SVG", async () => {
    const svgFile = new File(["<svg></svg>"], "image.svg", { type: "image/svg+xml" });
    const result = await compressImageFile(svgFile);
    expect(result).toBe(svgFile);
  });

  it("returns original file if file is not an image", async () => {
    const textFile = new File(["hello"], "file.txt", { type: "text/plain" });
    const result = await compressImageFile(textFile);
    expect(result).toBe(textFile);
  });

  it("returns original file if canvas context is not supported", async () => {
    const originalImage = window.Image;
    class MockImage {
      naturalWidth = 800;
      naturalHeight = 600;
      width = 800;
      height = 600;
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error Mock Image for testing
    window.Image = MockImage;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        const canvas = originalCreateElement("canvas");
        canvas.getContext = () => null;
        return canvas;
      }
      return originalCreateElement(tagName);
    });

    try {
      const imageFile = new File(["fake-image-bytes"], "photo.jpg", { type: "image/jpeg" });
      const result = await compressImageFile(imageFile);
      expect(result).toBe(imageFile);
    } finally {
      window.Image = originalImage;
    }
  });

  it("compresses and returns a new File when canvas and image load succeed", async () => {
    const mockBlob = new Blob(["compressed-bytes"], { type: "image/jpeg" });

    // Mock Image
    const originalImage = window.Image;
    class MockImage {
      naturalWidth = 2400;
      naturalHeight = 1600;
      width = 2400;
      height = 1600;
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error Mock Image for testing
    window.Image = MockImage;

    // Mock Canvas & Context
    const mockCtx = {
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        const canvas = originalCreateElement("canvas");
        // @ts-expect-error Mock getContext
        canvas.getContext = (contextId: string) => {
          if (contextId === "2d") return mockCtx;
          return null;
        };
        canvas.toBlob = (callback: BlobCallback) => {
          callback(mockBlob);
        };
        return canvas;
      }
      return originalCreateElement(tagName);
    });

    try {
      const originalFile = new File(["big-image-bytes"], "workout-photo.png", { type: "image/png" });
      const result = await compressImageFile(originalFile, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        mimeType: "image/jpeg",
      });

      expect(result).not.toBe(originalFile);
      expect(result.name).toBe("workout-photo.jpg");
      expect(result.type).toBe("image/jpeg");
      expect(mockCtx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 800);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 1200, 800);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-preview-url");
    } finally {
      window.Image = originalImage;
    }
  });

  it("handles image load failure gracefully by returning original file", async () => {
    const originalImage = window.Image;
    class MockImageError {
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onerror?.(new Error("Decode error")), 0);
      }
    }
    // @ts-expect-error Mock Image error
    window.Image = MockImageError;

    try {
      const originalFile = new File(["broken-bytes"], "broken.jpg", { type: "image/jpeg" });
      const result = await compressImageFile(originalFile);
      expect(result).toBe(originalFile);
    } finally {
      window.Image = originalImage;
    }
  });
});
