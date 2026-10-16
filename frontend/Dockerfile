# ==========================================
# Stage 1: Build React Static Bundle
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Hardened Nginx Runtime (~25MB total)
# ==========================================
FROM nginx:1.27-alpine AS runner

# Remove default nginx config and replace with our reverse-proxy config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy ONLY compiled static assets from Stage 1 (Node.js is completely discarded!)
COPY --from=builder /app/dist /usr/share/nginx/html

# Adjust permissions so Nginx worker processes run cleanly
RUN chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]