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
COPY shared/api/package.json ./shared/api/
COPY shared/store/package.json ./shared/store/
COPY shared/types/package.json ./shared/types/
COPY shared/ui/package.json ./shared/ui/
COPY core/analytics/package.json ./core/analytics/
COPY core/reminders/package.json ./core/reminders/
COPY features/auth/package.json ./features/auth/
COPY features/dashboard/package.json ./features/dashboard/
COPY features/onboarding/package.json ./features/onboarding/
COPY features/product/package.json ./features/product/

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
COPY shared/api/package.json ./shared/api/
COPY shared/store/package.json ./shared/store/
COPY shared/types/package.json ./shared/types/
COPY shared/ui/package.json ./shared/ui/
COPY core/analytics/package.json ./core/analytics/
COPY core/reminders/package.json ./core/reminders/
COPY features/auth/package.json ./features/auth/
COPY features/dashboard/package.json ./features/dashboard/
COPY features/onboarding/package.json ./features/onboarding/
COPY features/product/package.json ./features/product/

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
