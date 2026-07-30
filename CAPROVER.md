# Deploy NovaSMS Frontend on CapRover

## CapRover app

Create a CapRover app named `novasms-frontend`, connect this repository, and keep the repository root as the build context. The included `captain-definition` makes CapRover build `./Dockerfile`.

The frontend container listens on port `80`.

## Default API routing

The Docker build sets:

```env
VITE_API_BASE_URL=/api
VITE_API_URL=/api
```

The Nginx runtime proxies `/api` to:

```env
API_UPSTREAM=http://srv-captain--novasms-backend:3000
```

This default works when the backend CapRover app is named `novasms-backend`.

If your backend app has another name, set this runtime environment variable in CapRover:

```env
API_UPSTREAM=http://srv-captain--YOUR-BACKEND-APP:3000
```

## Alternative: direct backend domain

If you do not want the Nginx same-origin proxy, set these build arguments in CapRover:

```env
VITE_API_BASE_URL=https://YOUR-BACKEND-DOMAIN/api
VITE_API_URL=https://YOUR-BACKEND-DOMAIN/api
```

Then set the backend `FRONTEND_URL` to the frontend public URL so CORS allows browser requests.

## Optional build variables

```env
VITE_APP_NAME=NovaSMS
VITE_APP_ENV=production
VITE_IS_STAGING=false
```
