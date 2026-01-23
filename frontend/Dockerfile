FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY svelte.config.js vite.config.ts tsconfig.json ./
COPY src ./src
COPY static ./static

RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["node", "build/index.js"]
