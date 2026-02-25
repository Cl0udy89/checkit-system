# --- build stage (frontend) ---
FROM node:20-alpine AS build
WORKDIR /frontend

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

# --- nginx stage ---
FROM nginx:alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /frontend/dist /usr/share/nginx/html

EXPOSE 80
