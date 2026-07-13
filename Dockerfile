# Gift Platform - Multi-stage monolithic deployment

# Stage 1: Build frontend
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:24-alpine
RUN apk add --no-cache bash

WORKDIR /app/server

# Copy server deps
COPY server/package.json server/package-lock.json ./
RUN npm install --production

# Copy server source
COPY server/src/ server/src/

# Copy built frontend from stage 1
COPY --from=client-builder /app/client/dist/ /app/client/dist/

# Create data directories
RUN mkdir -p /app/server/data /app/server/uploads

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "src/app.js"]
