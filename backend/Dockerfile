FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/data /app/public/uploads

ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
