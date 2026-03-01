import { db } from "../db/database.js";
import { getBooleanSetting } from "../services/app-settings.service.js";
const isDevRole = (role) => role.toLowerCase() === "dev";
const isAdminRole = (role) => role.toLowerCase() === "admin";
export const getApprovedUserFromRequest = (request) => {
    const tokenUser = request.user;
    if (!tokenUser?.id)
        return null;
    const user = db
        .prepare("SELECT id, email, role, status, force_logout_after FROM users WHERE id = ?")
        .get(tokenUser.id);
    if (!user || user.status !== "approved")
        return null;
    if (user.force_logout_after) {
        const tokenIssuedAtMs = typeof tokenUser.iat === "number" ? tokenUser.iat * 1000 : 0;
        const forcedAfterMs = Date.parse(user.force_logout_after);
        if (!Number.isFinite(forcedAfterMs))
            return null;
        if (!tokenIssuedAtMs || tokenIssuedAtMs < forcedAfterMs)
            return null;
    }
    return user;
};
export const requireAuth = async (request, reply) => {
    await verifyApprovedUser(request, reply);
};
const verifyApprovedUser = async (request, reply) => {
    try {
        await request.jwtVerify();
    }
    catch {
        reply.code(401).send({ success: false, message: "Unauthorized" });
        return null;
    }
    const user = getApprovedUserFromRequest(request);
    if (!user) {
        reply.code(403).send({ success: false, message: "Forbidden" });
        return null;
    }
    return user;
};
export const requireAdmin = async (request, reply) => {
    const user = await verifyApprovedUser(request, reply);
    if (!user || reply.sent)
        return;
    if (!isAdminRole(user.role) && !isDevRole(user.role)) {
        return reply.code(403).send({ success: false, message: "Forbidden" });
    }
};
export const requireDev = async (request, reply) => {
    const user = await verifyApprovedUser(request, reply);
    if (!user || reply.sent)
        return;
    if (!isDevRole(user.role)) {
        return reply.code(403).send({ success: false, message: "Forbidden" });
    }
};
export const requireMaterialOrAdmin = async (request, reply) => {
    const user = await verifyApprovedUser(request, reply);
    if (!user || reply.sent)
        return;
    if (!isAdminRole(user.role) && !isDevRole(user.role) && user.role !== "materialwart") {
        return reply.code(403).send({ success: false, message: "Forbidden" });
    }
};
export const requireChatFeature = async (request, reply) => {
    await requireAuth(request, reply);
    if (reply.sent)
        return;
    if (!getBooleanSetting("chat_enabled", false)) {
        return reply.code(403).send({ success: false, message: "Chat ist derzeit deaktiviert." });
    }
};
