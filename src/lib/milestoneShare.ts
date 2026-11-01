// Draws the milestone image and shares it. Written so the same drawing and
// sharing approach can later be reused for word and fact share cards.

const PAPER = '#F6F4EF';
const INK = '#1C2B3A';
const EMBER = '#D8492F';
const GOLD = '#C7962E';
const FADED = '#7C8A93';

const DISPLAY_FONT = 'Fraunces, Georgia, "Times New Roman", serif';
const UI_FONT = 'Sora, "Helvetica Neue", Arial, sans-serif';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350; // 4:5, works for feeds, WhatsApp and stories

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFlame(ctx: CanvasRenderingContext2D, cx: number, top: number) {
  // outer flame
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + 70, top + 90, cx + 130, top + 170, cx + 130, top + 250);
  ctx.bezierCurveTo(cx + 130, top + 330, cx + 70, top + 380, cx, top + 380);
  ctx.bezierCurveTo(cx - 70, top + 380, cx - 130, top + 330, cx - 130, top + 250);
  ctx.bezierCurveTo(cx - 130, top + 190, cx - 95, top + 150, cx - 70, top + 110);
  ctx.bezierCurveTo(cx - 55, top + 150, cx - 35, top + 165, cx - 15, top + 165);
  ctx.bezierCurveTo(cx - 30, top + 100, cx - 20, top + 45, cx, top);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();

  // inner flame
  ctx.beginPath();
  ctx.moveTo(cx, top + 190);
  ctx.bezierCurveTo(cx + 40, top + 240, cx + 62, top + 280, cx + 62, top + 315);
  ctx.bezierCurveTo(cx + 62, top + 350, cx + 35, top + 372, cx, top + 372);
  ctx.bezierCurveTo(cx - 35, top + 372, cx - 62, top + 350, cx - 62, top + 315);
  ctx.bezierCurveTo(cx - 62, top + 280, cx - 38, top + 240, cx, top + 190);
  ctx.closePath();
  ctx.fillStyle = '#F3DDA0';
  ctx.fill();
}

export function drawMilestoneCard(ctx: CanvasRenderingContext2D, days: number) {
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(28, 43, 58, 0.12)';
  ctx.lineWidth = 3;
  roundedRect(ctx, 48, 48, W - 96, H - 96, 40);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = INK;
  ctx.font = `700 72px ${DISPLAY_FONT}`;
  ctx.fillText('Curi', W / 2, 175);

  drawFlame(ctx, W / 2, 235);

  // the number is the hero
  ctx.fillStyle = INK;
  ctx.font = `700 380px ${DISPLAY_FONT}`;
  ctx.fillText(String(days), W / 2, 975);

  const spaced = ctx as unknown as { letterSpacing?: string };
  if ('letterSpacing' in ctx) spaced.letterSpacing = '10px';
  ctx.fillStyle = GOLD;
  ctx.font = `600 54px ${UI_FONT}`;
  ctx.fillText('DAY STREAK', W / 2, 1065);
  if ('letterSpacing' in ctx) spaced.letterSpacing = '0px';

  ctx.fillStyle = FADED;
  ctx.font = `400 46px ${UI_FONT}`;
  ctx.fillText('One word. One fact. Every day.', W / 2, 1168);

  ctx.fillStyle = EMBER;
  ctx.font = `700 52px ${UI_FONT}`;
  ctx.fillText('trycuri.app', W / 2, 1252);
}

// Don't draw before the brand fonts are ready, but never hang waiting for them.
async function waitForFonts() {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await Promise.race([
      Promise.all([document.fonts.load('700 100px Fraunces'), document.fonts.load('600 40px Sora')]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // fall back to the system fonts
  }
}

export async function createMilestoneImage(days: number): Promise<File | null> {
  try {
    await waitForFonts();
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    drawMilestoneCard(ctx, days);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return new File([blob], `curi-${days}-day-streak.png`, { type: 'image/png' });
  } catch {
    return null;
  }
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

// Tries the best option the device offers: the image through the share sheet,
// then plain text through the share sheet, then copying the text.
export async function shareMilestone(days: number, image: File | null): Promise<ShareResult> {
  const url = `https://www.trycuri.app/?utm_source=share&utm_medium=milestone&utm_campaign=streak_${days}`;
  const text = `${days}-day streak on Curi. One word and one fact a day, and it adds up.`;

  try {
    if (image && navigator.canShare && navigator.canShare({ files: [image] })) {
      // some apps drop a separate url when a file is attached, so it goes in the text
      await navigator.share({ files: [image], text: `${text} ${url}` });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title: 'Curi', text, url });
      return 'shared';
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return 'cancelled'; // they closed the share sheet
    // anything else: fall through and copy instead
  }

  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}