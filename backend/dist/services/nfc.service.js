const PREFIX = "pfadi-inv:";
export const normalizeInventoryTag = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    if (trimmed.startsWith(PREFIX)) {
        return trimmed;
    }
    return null;
};
export const createInventoryTag = (uuid) => {
    return `${PREFIX}${uuid}`;
};
export const parseNfcPayload = (payload) => {
    const normalized = normalizeInventoryTag(payload);
    if (!normalized)
        return null;
    return { tagId: normalized };
};
export const parseQrPayload = (payload) => {
    const normalized = normalizeInventoryTag(payload);
    if (!normalized)
        return null;
    return { tagId: normalized };
};
