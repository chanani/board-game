FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# /api·/ws를 넘길 백엔드 주소. 실행할 때 -e BACKEND_ORIGIN=... 으로 바꾼다.
ENV BACKEND_ORIGIN=http://backend:8080
COPY templates/ /etc/nginx/templates/
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
