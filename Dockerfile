# Gift Platform - Full-stack monolithic deployment
FROM node:24-alpine

# Install bash for debugging (optional)
RUN apk add --no-cache bash

WORKDIR /app

# Copy server
COPY server/package.json server/package-lock.json server/
WORKDIR /app/server
RUN npm install --production

# Copy server source
COPY server/src/ server/src/

# Copy built frontend
COPY client/dist/ /app/client/dist/

WORKDIR /app/server

# Create data directories
RUN mkdir -p /app/server/data /app/server/uploads

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "src/app.js"]
