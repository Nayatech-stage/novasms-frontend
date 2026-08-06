FROM nginx:1.27-alpine

# Le build Vite se fait dans GitHub Actions (évite lightningcss + crash CapRover).
ENV API_UPSTREAM=http://srv-captain--nova-sms-backend:3000

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
