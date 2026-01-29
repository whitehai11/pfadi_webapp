export const requireAuth = async (request, reply) => {
    try {
        await request.jwtVerify();
    }
    catch {
        reply.code(401).send({ error: "Unauthorized" });
    }
};
export const requireAdmin = async (request, reply) => {
    try {
        await request.jwtVerify();
        const user = request.user;
        if (user?.role !== "admin") {
            reply.code(403).send({ error: "Forbidden" });
        }
    }
    catch {
        reply.code(401).send({ error: "Unauthorized" });
    }
};
export const requireMaterialOrAdmin = async (request, reply) => {
    try {
        await request.jwtVerify();
        const user = request.user;
        if (user?.role !== "admin" && user?.role !== "materialwart") {
            reply.code(403).send({ error: "Forbidden" });
        }
    }
    catch {
        reply.code(401).send({ error: "Unauthorized" });
    }
};
