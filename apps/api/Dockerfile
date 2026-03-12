FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY tsconfig.json ./

# Copy api files
COPY apps/api ./apps/api

# Install dependencies for the whole workspace
RUN npm install

# Build the api
WORKDIR /app/apps/api
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

WORKDIR /app/apps/api
CMD ["npm", "start"]
