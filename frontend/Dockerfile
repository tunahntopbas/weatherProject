# burada da multi-stage build var: Angular derlemesi (npm, node_modules, TypeScript
# derleyicisi) sadece bu asamada kaliyor, asagidaki nginx image'ina hic girmiyor
FROM node:24-alpine AS build
WORKDIR /app
# once sadece package.json + lock dosyasi kopyalanip npm ci calistiriliyor,
# kaynak kod (COPY . .) sonra geliyor - ayni backend'deki gibi Docker layer
# cache'ini korumak icin (bagimliklar degismedigi surece npm ci tekrar calismaz)
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# son image sadece derlenmis statik dosyalar (html/css/js) + nginx - Node.js'in
# kendisi son image'a hic girmiyor, bu yuzden image kucuk ve saldiri yuzeyi dar
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
