# ---- Build stage: install workspace deps and build the client ----
FROM node:22-slim AS build

# better-sqlite3 is a native module and needs a toolchain to compile
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY . .
RUN npm run build --workspace=client

# Drop devDependencies (vite, concurrently) from the runtime tree
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

# SQLite lives here — mount a persistent volume on this path
RUN mkdir -p /app/server/data

EXPOSE 3001

CMD ["node", "server/src/index.js"]
