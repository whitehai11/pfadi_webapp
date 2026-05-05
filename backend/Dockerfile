FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Write version.json so the app can report its version
ARG BUILD_VERSION=1.0.0
ARG BUILD_COMMIT=unknown
RUN node -e " \
  const fs = require('fs'); \
  fs.writeFileSync('/app/version.json', JSON.stringify({ \
    version: process.env.BUILD_VERSION || '${BUILD_VERSION}', \
    commit: process.env.BUILD_COMMIT || '${BUILD_COMMIT}', \
    updated_at: new Date().toISOString() \
  })); \
"

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]
