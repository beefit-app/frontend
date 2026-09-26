import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet";
import { BeeButton } from "../../BeeButton";
import { AVATAR_HEIGHT_RATIO } from "../constants";

const CROP_WIDTH = 240;
const CROP_HEIGHT = Math.round(CROP_WIDTH * AVATAR_HEIGHT_RATIO);
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// Mesmo polígono do HEX_CLIP, desenhado sobre a área de recorte. O retângulo
// menos o hexágono (evenodd) escurece só os cantos que o avatar vai esconder.
const W = CROP_WIDTH;
const H = CROP_HEIGHT;
const HEX_POINTS = `${W / 2},0 ${W},${H * 0.25} ${W},${H * 0.75} ${W / 2},${H} 0,${H * 0.75} 0,${H * 0.25}`;
const HEX_PATH = `M${W / 2} 0L${W} ${H * 0.25}L${W} ${H * 0.75}L${W / 2} ${H}L0 ${H * 0.75}L0 ${H * 0.25}Z`;

export function AvatarCropSheet({
  imageUrl,
  isProcessing = false,
  error,
  onCancel,
  onConfirm,
}: {
  imageUrl: string | null;
  isProcessing?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (area: Area) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area | null>(null);

  // Cada foto nova começa centralizada e sem zoom, não no enquadramento da anterior.
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setArea(null);
  }, [imageUrl]);

  return (
    <Sheet
      open={imageUrl !== null}
      onOpenChange={(open) => {
        if (!open && !isProcessing) onCancel();
      }}
    >
      <SheetContent
        side="bottom"
        className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white"
      >
        <SheetHeader>
          <SheetTitle className="font-montserrat text-[20px] font-bold text-white">Ajustar foto</SheetTitle>
          <SheetDescription className="font-inter text-[13px] text-[#8A8A8A]">
            Arraste e use o zoom para escolher o que aparece no seu perfil.
          </SheetDescription>
        </SheetHeader>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div
            style={{ position: "relative", width: CROP_WIDTH, height: CROP_HEIGHT, overflow: "hidden", touchAction: "none" }}
            data-testid="avatar-crop-area"
          >
            {imageUrl && (
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={1 / AVATAR_HEIGHT_RATIO}
                objectFit="cover"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, areaPixels) => setArea(areaPixels)}
                style={{ cropAreaStyle: { border: "none", color: "transparent" } }}
              />
            )}
            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <path d={`M0 0H${W}V${H}H0Z${HEX_PATH}`} fill="rgba(10,10,10,0.72)" fillRule="evenodd" />
              <polygon points={HEX_POINTS} fill="none" stroke="#FFD700" strokeWidth={2} />
            </svg>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: "#A3A3A3" }}>Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Zoom da foto"
              style={{ flex: 1, accentColor: "#FFD700" }}
            />
          </label>

          {error && (
            <span role="alert" style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#EF4444", fontWeight: 500 }}>
              {error}
            </span>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <BeeButton
              variant="primary"
              fullWidth
              disabled={!area || isProcessing}
              onClick={() => {
                if (area) onConfirm(area);
              }}
            >
              {isProcessing ? "Recortando..." : "Usar foto"}
            </BeeButton>
            <BeeButton variant="dark" fullWidth disabled={isProcessing} onClick={onCancel}>
              Cancelar
            </BeeButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
