ARG BASE_PATH=/

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.mjs ./
COPY src ./src
COPY public ./public
COPY server/admin.js ./server/admin.js
ARG BASE_PATH
RUN BASE_PATH="$BASE_PATH" npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ARG BASE_PATH
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    BASE_PATH=$BASE_PATH
COPY package.json ./
COPY server/admin.js server/index.js ./server/
COPY public/studio-model.js ./public/studio-model.js
COPY --from=build /app/dist ./dist
RUN mkdir -p config .data && chown node:node .data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "--input-type=module", "-e", "const response = await fetch('http://127.0.0.1:' + process.env.PORT + process.env.BASE_PATH + 'api/admin/session', { signal: AbortSignal.timeout(4000) }); if (!response.ok) process.exit(1);"]
CMD ["node", "server/index.js"]
