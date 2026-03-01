// engineered by Maro Elias Goth
export const sanitizeText = (value: string, maxLength: number) => {
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
  return cleaned;
};

export const sanitizeMultilineText = (value: string, maxLength: number) => {
  const cleaned = value
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
  return cleaned;
};

export const hasUnsafePattern = (value: string) => {
  const lowered = value.toLowerCase();
  return (
    lowered.includes("<script") ||
    lowered.includes("javascript:") ||
    lowered.includes("onerror=") ||
    lowered.includes("onload=")
  );
};

export const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
