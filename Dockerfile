FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /work/wormez
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run check:ui && npm run build:ui

CMD ["npm", "run", "test:all"]
