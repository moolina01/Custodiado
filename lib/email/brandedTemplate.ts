import "server-only";

/**
 * Custodiado's branded email — every email the app sends goes through
 * this (see `sendBrandedEmail` in ./send): navy header with the white
 * wordmark, a white card with the content, and the brand footer, plus a
 * plain-text version generated from the same content for clients that
 * don't render HTML (`renderBrandedText`), so the two never drift apart.
 *
 * Built with tables + inline styles on purpose: that's the only layout
 * email clients render consistently (Gmail strips <style> blocks in some
 * views, Outlook ignores flexbox/grid entirely). Images are absolute URLs
 * under `APP_BASE_URL` — the recipient's mail client downloads them from
 * there, so in production (public domain) the logo shows; an email sent
 * from a local dev server points at localhost, which no mail client can
 * reach.
 *
 * Every dynamic string goes through `escapeHtml`: item names, people's
 * names and support questions are user input.
 */

const BRAND = {
  navy: "#16234A",
  accent: "#3B82F6",
  accentSoft: "#DBEAFE",
  page: "#F5F7FB",
  border: "#DCE3EF",
  borderSoft: "#E8ECF5",
  text: "#0B1220",
  textMuted: "#48546B",
  textFaint: "#8993A8",
  success: "#2E8B57",
  successBg: "#E7F1EA",
  warn: "#B45309",
  warnBg: "#FFF6EE",
  warnBorder: "#F3D8B8",
  danger: "#B3402C",
  dangerBg: "#FBEAE5",
  neutralBg: "#EEF2F9",
  star: "#F5B014",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** The round badge above the title — color + glyph say at a glance what kind of news this is. */
export type EmailTone = "success" | "info" | "neutral" | "warning" | "danger";

const TONE: Record<EmailTone, { bg: string; fg: string; glyph: string }> = {
  success: { bg: BRAND.successBg, fg: BRAND.success, glyph: "&#10003;" }, // ✓
  info: { bg: BRAND.accentSoft, fg: BRAND.accent, glyph: "i" },
  neutral: { bg: BRAND.neutralBg, fg: BRAND.textMuted, glyph: "&#8617;" }, // ↩
  warning: { bg: BRAND.warnBg, fg: BRAND.warn, glyph: "!" },
  danger: { bg: BRAND.dangerBg, fg: BRAND.danger, glyph: "!" },
};

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export type BrandedEmail = {
  baseUrl: string;
  preheader: string; // inbox preview line, hidden in the body
  tone: EmailTone;
  eyebrow?: string; // small label above the title, e.g. "Trato ABC-123"
  title: string;
  intro: string;
  details?: [label: string, value: string][];
  highlight?: { label: string; value: string }; // big number row under the details, e.g. the amount
  notice?: string; // highlighted callout, e.g. "No entregues nada antes de este aviso"
  blocks?: { label: string; body: string }[]; // longer free text, e.g. a support question and its answer
  cta?: { label: string; url: string };
  rating?: { url: string }; // "¿Cómo te fue?" — each star links to `${url}?score=N`
  footnote: string; // why they got this email
};

function detailsTable(details: [string, string][], highlight: BrandedEmail["highlight"]): string {
  const rows = details
    .map(
      ([label, value], i) => `
        <tr>
          <td style="padding:12px 16px;${i > 0 ? `border-top:1px solid ${BRAND.borderSoft};` : ""}font-family:${FONT};font-size:14px;color:${BRAND.textMuted};">${escapeHtml(label)}</td>
          <td align="right" style="padding:12px 16px;${i > 0 ? `border-top:1px solid ${BRAND.borderSoft};` : ""}font-family:${FONT};font-size:14px;font-weight:600;color:${BRAND.text};">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
  const highlightRow = highlight
    ? `
        <tr>
          <td style="padding:14px 16px;${rows ? `border-top:1px solid ${BRAND.border};` : ""}background:${BRAND.page};font-family:${FONT};font-size:14px;font-weight:600;color:${BRAND.text};">${escapeHtml(highlight.label)}</td>
          <td align="right" style="padding:14px 16px;${rows ? `border-top:1px solid ${BRAND.border};` : ""}background:${BRAND.page};font-family:${FONT};font-size:20px;font-weight:800;color:${BRAND.text};">${escapeHtml(highlight.value)}</td>
        </tr>`
    : "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border:1px solid ${BRAND.border};border-radius:12px;border-collapse:separate;overflow:hidden;">
      ${rows}${highlightRow}
    </table>`;
}

function noticeBox(notice: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="padding:14px 16px;background:${BRAND.warnBg};border:1px solid ${BRAND.warnBorder};border-radius:12px;font-family:${FONT};font-size:14px;line-height:21px;font-weight:600;color:${BRAND.text};">${escapeHtml(notice)}</td>
      </tr>
    </table>`;
}

function textBlocks(blocks: { label: string; body: string }[]): string {
  return blocks
    .map(
      ({ label, body }) => `
    <div style="margin-top:20px;">
      <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${BRAND.textFaint};margin-bottom:6px;">${escapeHtml(label)}</div>
      <div style="padding:14px 16px;background:${BRAND.page};border-radius:12px;font-family:${FONT};font-size:15px;line-height:23px;color:${BRAND.text};white-space:pre-line;">${escapeHtml(body)}</div>
    </div>`
    )
    .join("");
}

function ratingBlock(url: string): string {
  const stars = [1, 2, 3, 4, 5]
    .map(
      (score) =>
        `<a href="${escapeHtml(`${url}?score=${score}`)}" title="${score} de 5" style="display:inline-block;padding:0 4px;font-size:34px;line-height:40px;color:${BRAND.star};text-decoration:none;">&#9733;</a>`
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid ${BRAND.borderSoft};">
      <tr>
        <td align="center" style="padding:28px 0 4px;">
          <div style="font-family:${FONT};font-size:17px;font-weight:700;color:${BRAND.text};">¿Cómo te fue?</div>
          <div style="font-family:${FONT};font-size:14px;color:${BRAND.textMuted};margin-top:4px;">Toca una estrella para calificar tu experiencia, toma 10 segundos.</div>
          <div style="margin-top:12px;">${stars}</div>
        </td>
      </tr>
    </table>`;
}

export function renderBrandedEmail(email: BrandedEmail): string {
  const logoUrl = `${email.baseUrl}/logocustodiado.png`;
  const tone = TONE[email.tone];
  const cta = email.cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td style="border-radius:12px;background:${BRAND.navy};">
            <a href="${escapeHtml(email.cta.url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(email.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(email.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.page};">${escapeHtml(email.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="background:${BRAND.navy};border-radius:16px 16px 0 0;padding:26px 24px;">
              <a href="${escapeHtml(email.baseUrl)}" style="text-decoration:none;">
                <img src="${escapeHtml(logoUrl)}" width="170" height="28" alt="Custodiado" style="display:block;border:0;width:170px;height:auto;max-width:170px;color:#ffffff;font-family:${FONT};font-size:22px;font-weight:800;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid ${BRAND.border};border-top:0;border-radius:0 0 16px 16px;padding:36px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:22px;background:${tone.bg};font-family:${FONT};font-size:21px;font-weight:800;color:${tone.fg};">${tone.glyph}</td>
                </tr>
              </table>
              ${email.eyebrow ? `<div style="margin-top:20px;font-family:${FONT};font-size:12.5px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${BRAND.textFaint};">${escapeHtml(email.eyebrow)}</div>` : ""}
              <h1 style="margin:${email.eyebrow ? "6px" : "20px"} 0 10px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:800;letter-spacing:-0.3px;color:${BRAND.text};">${escapeHtml(email.title)}</h1>
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:23px;color:${BRAND.textMuted};">${escapeHtml(email.intro)}</p>
              ${email.notice ? noticeBox(email.notice) : ""}
              ${email.blocks ? textBlocks(email.blocks) : ""}
              ${email.details || email.highlight ? detailsTable(email.details ?? [], email.highlight) : ""}
              ${cta}
              ${email.rating ? ratingBlock(email.rating.url) : ""}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 16px 8px;font-family:${FONT};font-size:12.5px;line-height:19px;color:${BRAND.textFaint};">
              <strong style="color:${BRAND.textMuted};">Custodiado</strong> · Pago seguro entre particulares · Procesado por Mercado Pago<br>
              ${escapeHtml(email.footnote)}<br>
              <a href="${escapeHtml(`${email.baseUrl}/soporte`)}" style="color:${BRAND.textMuted};text-decoration:underline;">Centro de ayuda</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** The plain-text twin of `renderBrandedEmail`, from the same content — sent alongside it as the fallback. */
export function renderBrandedText(email: BrandedEmail): string {
  const lines: string[] = [];
  if (email.eyebrow) lines.push(email.eyebrow);
  lines.push(email.title, "", email.intro);
  if (email.notice) lines.push("", email.notice);
  for (const block of email.blocks ?? []) lines.push("", `${block.label}:`, block.body);
  const rows = [...(email.details ?? []), ...(email.highlight ? [[email.highlight.label, email.highlight.value] as [string, string]] : [])];
  if (rows.length > 0) lines.push("", ...rows.map(([label, value]) => `${label}: ${value}`));
  if (email.cta) lines.push("", `${email.cta.label}: ${email.cta.url}`);
  if (email.rating) lines.push("", "¿Cómo te fue? Califica tu experiencia, toma 10 segundos:", email.rating.url);
  lines.push("", "—", "Custodiado · Pago seguro entre particulares", email.footnote);
  return lines.join("\n");
}
