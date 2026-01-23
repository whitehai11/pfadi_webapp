const PREFIX = "pfadi-inv:";

export const normalizeInventoryTag = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(PREFIX)) {
    return trimmed;
  }
  return null;
};

export const createInventoryTag = (uuid: string): string => {
  return `${PREFIX}${uuid}`;
};

export const parseNfcPayload = (payload: string): { tagId: string } | null => {
  const normalized = normalizeInventoryTag(payload);
  if (!normalized) return null;
  return { tagId: normalized };
};

export const parseQrPayload = (payload: string): { tagId: string } | null => {
  const normalized = normalizeInventoryTag(payload);
  if (!normalized) return null;
  return { tagId: normalized };
};
