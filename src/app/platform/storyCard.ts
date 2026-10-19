import logoImg from "../../imports/logo.png";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const SIDE_PADDING = 72;
// Altura reservada no rodapé para data, título e métricas. Uma foto que não cobre
// o card é encaixada acima dela, para não ficar escondida atrás das métricas.
const INFO_BLOCK_HEIGHT = 780;
// Acima disso o cover cortaria demais a foto do usuário; um quadrado perderia 44%
// da largura. Nesses casos a foto inteira aparece sobre um fundo desfocado dela.
const MAX_COVER_CROP = 0.25;
// Uma foto encaixada (contain) fica entre o cabeçalho e o bloco de métricas, com
// margem lateral para ler como um quadro e não colar o logo na borda dela.
const PHOTO_AREA = { top: 240, bottom: STORY_HEIGHT - INFO_BLOCK_HEIGHT, side: 48 };
const BADGE_GAP = 24;
const BADGE_HEIGHT = 168;

export interface StoryCardData {
  title: string;
  finishedAt: string;
  durationSeconds: number;
  totalVolumeKg: number;
  estimatedCalories: number;
  exerciseCount: number;
  setCount: number;
  photo: Blob | null;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PhotoLayout =
  | { mode: "cover"; source: Rect }
  | { mode: "contain"; target: Rect };

function computeCoverSource(photoWidth: number, photoHeight: number): Rect {
  const storyRatio = STORY_WIDTH / STORY_HEIGHT;
  const photoRatio = photoWidth / photoHeight;
  const width = photoRatio > storyRatio ? photoHeight * storyRatio : photoWidth;
  const height = photoRatio > storyRatio ? photoHeight : photoWidth / storyRatio;
  return { x: (photoWidth - width) / 2, y: (photoHeight - height) / 2, width, height };
}

export function computePhotoLayout(photoWidth: number, photoHeight: number): PhotoLayout {
  const storyRatio = STORY_WIDTH / STORY_HEIGHT;
  const photoRatio = photoWidth / photoHeight;
  const crop = photoRatio > storyRatio ? 1 - storyRatio / photoRatio : 1 - photoRatio / storyRatio;

  if (crop <= MAX_COVER_CROP) return { mode: "cover", source: computeCoverSource(photoWidth, photoHeight) };

  const areaWidth = STORY_WIDTH - PHOTO_AREA.side * 2;
  const areaHeight = PHOTO_AREA.bottom - PHOTO_AREA.top;
  const scale = Math.min(areaWidth / photoWidth, areaHeight / photoHeight);
  const width = photoWidth * scale;
  const height = photoHeight * scale;
  return {
    mode: "contain",
    target: {
      x: (STORY_WIDTH - width) / 2,
      y: PHOTO_AREA.top + (areaHeight - height) / 2,
      width,
      height,
    },
  };
}

/** Quebra o texto em até `maxLines` linhas; o que sobra vira reticências na última. */
export function wrapText(
  text: string,
  measure: (value: string) => number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);

  if (lines.length <= maxLines && lines.every((line) => measure(line) <= maxWidth)) return lines;

  const kept = lines.slice(0, maxLines);
  const overflowed = lines.length > maxLines;
  let last = overflowed ? `${kept[maxLines - 1]} ${lines.slice(maxLines).join(" ")}` : kept[kept.length - 1];
  while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1).trimEnd();
  kept[kept.length - 1] = `${last}…`;
  return kept;
}

export function formatStoryDuration(totalSeconds: number) {
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}

export function formatStoryDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export function buildStoryMetrics(data: StoryCardData) {
  const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  return [
    { label: "Duração", value: formatStoryDuration(data.durationSeconds) },
    { label: "Volume", value: `${number.format(data.totalVolumeKg)} kg` },
    { label: "Calorias", value: `${number.format(data.estimatedCalories)} kcal` },
    { label: "Exercícios", value: number.format(data.exerciseCount) },
    { label: "Séries", value: number.format(data.setCount) },
  ];
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar imagem do card."));
    image.src = source;
  });
}

async function loadBlobImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// O canvas não espera a webfont: sem isto, a primeira geração do card sai com a
// fonte de fallback e a largura medida para o título fica errada. O `ready` vem
// antes porque `load` resolve vazio enquanto a folha do Google Fonts ainda não
// registrou o @font-face.
async function ensureFontsLoaded() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load("800 96px Montserrat"),
      document.fonts.load("700 40px Montserrat"),
      document.fonts.load("600 32px Inter"),
    ]);
  } catch {
    // Sem a fonte o card continua legível com a fonte do sistema.
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number) {
  const { x, y, width, height } = rect;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawBrandBackground(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null) {
  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const glow = ctx.createRadialGradient(STORY_WIDTH / 2, 620, 40, STORY_WIDTH / 2, 620, 760);
  glow.addColorStop(0, "rgba(255,215,0,0.28)");
  glow.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  if (logo) {
    const size = 420;
    ctx.save();
    roundedRect(ctx, { x: (STORY_WIDTH - size) / 2, y: 410, width: size, height: size }, 96);
    ctx.clip();
    ctx.drawImage(logo, (STORY_WIDTH - size) / 2, 410, size, size);
    ctx.restore();
  }
}

function drawPhotoBackground(ctx: CanvasRenderingContext2D, photo: HTMLImageElement) {
  const layout = computePhotoLayout(photo.naturalWidth, photo.naturalHeight);
  if (layout.mode === "cover") {
    const { x, y, width, height } = layout.source;
    ctx.drawImage(photo, x, y, width, height, 0, 0, STORY_WIDTH, STORY_HEIGHT);
    return;
  }

  // Desfoque por redução e ampliação: ctx.filter não existe no Safari antes do 18.
  const small = document.createElement("canvas");
  small.width = 36;
  small.height = 64;
  const smallCtx = small.getContext("2d");
  const cover = computeCoverSource(photo.naturalWidth, photo.naturalHeight);
  if (smallCtx) {
    smallCtx.drawImage(photo, cover.x, cover.y, cover.width, cover.height, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(small, 0, 0, STORY_WIDTH, STORY_HEIGHT);
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const { x, y, width, height } = layout.target;
  ctx.save();
  roundedRect(ctx, { x, y, width, height }, 32);
  ctx.clip();
  ctx.drawImage(photo, x, y, width, height);
  ctx.restore();
}

function drawContrastGradient(ctx: CanvasRenderingContext2D) {
  const top = ctx.createLinearGradient(0, 0, 0, 360);
  top.addColorStop(0, "rgba(0,0,0,0.55)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, STORY_WIDTH, 360);

  const bottomStart = STORY_HEIGHT - INFO_BLOCK_HEIGHT - 240;
  const bottom = ctx.createLinearGradient(0, bottomStart, 0, STORY_HEIGHT);
  bottom.addColorStop(0, "rgba(0,0,0,0)");
  bottom.addColorStop(0.35, "rgba(0,0,0,0.7)");
  bottom.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, bottomStart, STORY_WIDTH, STORY_HEIGHT - bottomStart);
}

function drawHeader(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null) {
  const size = 96;
  let textX = SIDE_PADDING;
  if (logo) {
    ctx.save();
    roundedRect(ctx, { x: SIDE_PADDING, y: 96, width: size, height: size }, 26);
    ctx.clip();
    ctx.drawImage(logo, SIDE_PADDING, 96, size, size);
    ctx.restore();
    textX += size + 24;
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 52px Montserrat, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("BeeFit", textX, 96 + size / 2);
}

/** Reduz a fonte até o valor caber no badge, para nenhuma métrica vazar. */
function fitFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, min: number) {
  let size = start;
  ctx.font = `800 ${size}px Montserrat, sans-serif`;
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `800 ${size}px Montserrat, sans-serif`;
  }
  return size;
}

function drawBadge(ctx: CanvasRenderingContext2D, rect: Rect, label: string, value: string) {
  roundedRect(ctx, rect, 32);
  ctx.fillStyle = "rgba(20,20,20,0.78)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,215,0,0.35)";
  ctx.stroke();

  const innerX = rect.x + 28;
  const innerWidth = rect.width - 56;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#A3A3A3";
  ctx.font = "600 26px Inter, sans-serif";
  ctx.fillText(label.toUpperCase(), innerX, rect.y + 56);

  ctx.fillStyle = "#FFFFFF";
  fitFontSize(ctx, value, innerWidth, 56, 30);
  ctx.fillText(value, innerX, rect.y + 132);
}

function drawInfo(ctx: CanvasRenderingContext2D, data: StoryCardData) {
  const contentWidth = STORY_WIDTH - SIDE_PADDING * 2;
  const metrics = buildStoryMetrics(data);
  const rows = [metrics.slice(0, 3), metrics.slice(3)];
  const badgesHeight = rows.length * BADGE_HEIGHT + (rows.length - 1) * BADGE_GAP;
  const badgesTop = STORY_HEIGHT - 120 - badgesHeight;

  ctx.font = "800 88px Montserrat, sans-serif";
  const titleLines = wrapText(data.title, (value) => ctx.measureText(value).width, contentWidth, 2);
  const lineHeight = 100;
  const titleBottom = badgesTop - 56;
  const titleTop = titleBottom - titleLines.length * lineHeight;

  const date = formatStoryDate(data.finishedAt);
  if (date) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "600 34px Inter, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(date.toUpperCase(), SIDE_PADDING, titleTop - 28);
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 88px Montserrat, sans-serif";
  ctx.textBaseline = "alphabetic";
  titleLines.forEach((line, index) => {
    ctx.fillText(line, SIDE_PADDING, titleTop + (index + 1) * lineHeight - 18);
  });

  rows.forEach((row, rowIndex) => {
    const width = (contentWidth - BADGE_GAP * (row.length - 1)) / row.length;
    row.forEach((metric, index) => {
      drawBadge(
        ctx,
        {
          x: SIDE_PADDING + index * (width + BADGE_GAP),
          y: badgesTop + rowIndex * (BADGE_HEIGHT + BADGE_GAP),
          width,
          height: BADGE_HEIGHT,
        },
        metric.label,
        metric.value,
      );
    });
  });
}

export async function renderStoryCard(data: StoryCardData): Promise<Blob> {
  await ensureFontsLoaded();
  const [logo, photo] = await Promise.all([
    loadImage(logoImg).catch(() => null),
    data.photo ? loadBlobImage(data.photo).catch(() => null) : Promise.resolve(null),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível para gerar o card.");

  if (photo) drawPhotoBackground(ctx, photo);
  else drawBrandBackground(ctx, logo);
  drawContrastGradient(ctx);
  drawHeader(ctx, logo);
  drawInfo(ctx, data);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao exportar o card."));
    }, "image/png");
  });
}
