FROM node:22-bullseye-slim

# Create app directory
WORKDIR /app

# Install dependencies. We copy package.json files first to leverage layer caching.

# Copy package manifests for root, frontend and backend
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install root dependencies (if any) and per-package deps.
# We explicitly install backend and frontend dependencies so the backend's
# modules (dotenv, pg, sqlite3, etc.) are available at runtime.
RUN npm install
RUN npm install --prefix backend --no-audit --no-fund
RUN npm install --prefix frontend --no-audit --no-fund

# Copy the rest of the source after installing manifests to leverage cache
COPY . .

# Build frontend (Next) for production
RUN cd frontend && npm run build

# Expose backend port
EXPOSE 5001

# Start the backend server directly
CMD ["node", "backend/server.js"]
