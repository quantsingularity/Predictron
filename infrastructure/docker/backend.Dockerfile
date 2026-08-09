# Build context is the repo root (see infrastructure/docker-compose.yml),
# so every COPY below is rooted at code/backend/.

FROM node:20-alpine AS build
WORKDIR /app
COPY code/backend/package.json code/backend/package-lock.json* ./
RUN npm install
COPY code/backend/prisma ./prisma
RUN npx prisma generate
COPY code/backend/tsconfig.json ./
COPY code/backend/src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/server.js"]
