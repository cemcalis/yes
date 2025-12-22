FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# Use ci if lockfile exists, otherwise install
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

RUN mkdir -p /app/data /app/public/uploads

ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
