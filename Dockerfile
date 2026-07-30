FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund \
  --fetch-retries=5 \
  --fetch-retry-mintimeout=20000 \
  --fetch-retry-maxtimeout=120000

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_API_URL
ARG VITE_APP_NAME=NovaSMS
ARG VITE_APP_ENV=production
ARG VITE_IS_STAGING=false

RUN VITE_API_BASE_URL="$VITE_API_BASE_URL" \
  VITE_API_URL="${VITE_API_URL:-$VITE_API_BASE_URL}" \
  VITE_APP_NAME="$VITE_APP_NAME" \
  VITE_APP_ENV="$VITE_APP_ENV" \
  VITE_IS_STAGING="$VITE_IS_STAGING" \
  npm run build

FROM nginx:1.27-alpine AS runtime

ENV API_UPSTREAM=http://srv-captain--novasms-backend:3000

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
