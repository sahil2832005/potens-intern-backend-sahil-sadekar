FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci && npx prisma generate

COPY src ./src

RUN addgroup -g 1001 -S app && adduser -S app -u 1001
USER app

EXPOSE 3000
CMD ["node", "src/server.js"]
