# Production Dockerfile
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json tsconfig.json ./

# Copy package.json files from workspace (Docker doesn't support glob, copy individually)
COPY apps/inventory/package.json ./apps/inventory/
COPY platform/contracts/package.json ./platform/contracts/
COPY platform/access/package.json ./platform/access/
COPY platform/session/package.json ./platform/session/
COPY ui-kit/package.json ./ui-kit/
COPY core/analytics/package.json ./core/analytics/
COPY core/reminders/package.json ./core/reminders/
COPY core/plan/package.json ./core/plan/
COPY core/user/package.json ./core/user/
COPY core/pricing/package.json ./core/pricing/
COPY core/product/package.json ./core/product/

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY . .

# Build the application
RUN pnpm nx build inventory

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json tsconfig.json ./

# Copy package.json files for all workspace packages (Docker doesn't support glob, copy individually)
COPY apps/inventory/package.json ./apps/inventory/
COPY platform/contracts/package.json ./platform/contracts/
COPY platform/access/package.json ./platform/access/
COPY platform/session/package.json ./platform/session/
COPY ui-kit/package.json ./ui-kit/
COPY core/analytics/package.json ./core/analytics/
COPY core/reminders/package.json ./core/reminders/
COPY core/plan/package.json ./core/plan/
COPY core/user/package.json ./core/user/
COPY core/pricing/package.json ./core/pricing/
COPY core/product/package.json ./core/product/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/apps/inventory/build ./apps/inventory/build

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Change to the root directory for pnpm exec
WORKDIR /app

# Run the production server using @react-router/serve from installed dependencies
# React Router builds to 'build' directory
CMD ["pnpm", "exec", "react-router-serve", "apps/inventory/build/server/index.js", "apps/inventory/build/client"]
