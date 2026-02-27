import { db } from "../db/database.js";
import { getBooleanSetting } from "../services/app-settings.service.js";
export const getApprovedUserFromRequest = (request) => {
    const tokenUser = request.user;
    if (!tokenUser?.id)
        return null;
    const user = db
        .prepare("SELECT id, email, role, status FROM users WHERE id = ?")
        .get(tokenUser.id);
    if (!user || user.status !== "approved")
        return null;
    return user;
};
export const requireAuth = async (request, reply) => {
    try {
        await request.jwtVerify();
        if (!getApprovedUserFromRequest(request)) {
            return reply.code(403).send({ error: "Forbidden" });
        }
    }
    catch {
        return reply.code(401).send({ error: "Unauthorized" });
    }
};
export const requireAdmin = async (request, reply) => {
    try {
        await request.jwtVerify();
        const user = getApprovedUserFromRequest(request);
        if (user?.role !== "admin") {
            return reply.code(403).send({ error: "Forbidden" });
        }
    }
    catch {
        return reply.code(401).send({ error: "Unauthorized" });
    }
};
export const requireMaterialOrAdmin = async (request, reply) => {
    try {
        await request.jwtVerify();
        const user = getApprovedUserFromRequest(request);
        if (user?.role !== "admin" && user?.role !== "materialwart") {
            return reply.code(403).send({ error: "Forbidden" });
        }
    }
    catch {
        return reply.code(401).send({ error: "Unauthorized" });
    }
};
export const requireChatFeature = async (request, reply) => {
    await requireAuth(request, reply);
    if (reply.sent)
        return;
    if (!getBooleanSetting("chat_enabled", false)) {
        return reply.code(403).send({ error: "Chat ist derzeit deaktiviert." });
    }
};
