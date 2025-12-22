FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
# Install with dev deps for build (ts/types needed); fall back to install if no lockfile
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./
# Strip dev dependencies for runtime
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["npm", "run", "start"]
