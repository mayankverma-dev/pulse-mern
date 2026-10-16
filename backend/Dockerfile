# ==========================================
# Stage 1: Dependency Installation
# ==========================================
FROM node:22-alpine AS deps
WORKDIR /app

# Copy only manifest files first to leverage Docker layer cache
COPY package.json package-lock.json ./

# npm ci installs exact versions from package-lock.json and omits devDependencies
RUN npm ci --omit=dev && npm cache clean --force

# ==========================================
# Stage 2: Production Runtime Image
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root ownership and copy only production node_modules + source
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node ./src ./src
COPY --chown=node:node package.json ./

# Drop root privileges
USER node

EXPOSE 5000

# Built-in Docker Healthcheck using Node's native fetch (no curl/wget needed in image!)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:5000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

# Exec form ensures Node runs as PID 1 and receives SIGTERM directly
CMD ["node", "src/index.js"]