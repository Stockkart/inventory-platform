# InventoryPlatform

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is almost ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/getting-started/tutorials/react-monorepo-tutorial?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `pnpm nx graph` to visually explore what was created. Now, let's get you up to speed!

## Vertical schema (Phases 2–4)

The platform renders **vertical-specific fields** from the inventory API schema — no hardcoded pharmacy forms or medical loading fallbacks.

| Phase                     | Status         | Highlights                                                           |
| ------------------------- | -------------- | -------------------------------------------------------------------- |
| **2 — Dynamic UI**        | Mostly shipped | Onboarding, registration, scan-sell `businessType`                   |
| **3 — Extension storage** | Shipped        | `verticalFields` on create/read; no top-level `batchNo`/`expiryDate` |
| **4 — Search**            | Shipped        | `searchWithFilters`, expiry buckets, near-expiry filters             |

| Surface              | Schema source                                        | Notes                                                              |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| Onboarding           | `GET /verticals`, `GET /verticals/{id}/schema`       | Vertical picker; shop fields (`dlNo`, `fssai`) only when in schema |
| Product registration | `GET /shops/me/schema?mode=regular\|basic`           | Grid + list columns from API schema; `verticalFields` on create    |
| Product search       | `GET /inventory/search` + schema `searchable` fields | Batch no. + near-expiry days filters when in schema                |
| Scan-sell            | Shop `verticalId`                                    | `businessType` from shop, not `pharmacy`                           |
| Reminders            | `GET /reminders/expiry-buckets`                      | Expiry bucket summary cards                                        |

**Shared libraries:** `@inventory-platform/types` (`vertical-schema.ts`), `@inventory-platform/api` (`verticals.ts`, `inventory.ts`), `@inventory-platform/store` (`useVerticalSchemaStore`), `@inventory-platform/ui` (`verticalSchemaUtils`, `VerticalSchemaFieldInput`).

**Backend architecture:** see [inventory-api `docs/VERTICAL_PLUGIN_ARCHITECTURE.md`](../inventory-api/docs/VERTICAL_PLUGIN_ARCHITECTURE.md) (v4.9).

**Remaining (roadmap):** scan-sell detail modal schema columns; import fully schema-driven; FEFO in checkout UI; widget registry (Phase 6).

**After API seed changes:** restart API or reseed `vertical_schemas` so the UI picks up new field labels.

---

## Quick Start

**Option 1: Run with Docker (Recommended for first-time setup)**

```sh
cp .env-example .env
docker-compose up
```

See the [Docker Setup](#docker-setup) section below for detailed instructions.

**Option 2: Run locally**

Install dependencies and run the dev server:

```sh
pnpm install
pnpm nx dev inventory
```

## Finish your CI setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/rh86xW12uX)

## Run tasks

To run the dev server for your app, use:

```sh
pnpm exec nx dev inventory
```

Or alternatively:

```sh
pnpm nx serve inventory
```

To create a production bundle:

```sh
pnpm nx build inventory
```

To see all available targets to run for a project, run:

```sh
pnpm nx show project inventory
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Docker Setup

This project includes Docker configuration for easy development and deployment. The setup includes three containers:

- **MongoDB** - Database service
- **Inventory Server** - Backend API (using `myntrack/inventory-backend` image)
- **Inventory Platform** - Frontend application

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually comes with Docker Desktop)

### Quick Start

1. **Set up environment variables:**

   ```sh
   cp .env-example .env
   ```

   Edit `.env` file with your configuration values. The `.env` file contains:

   - MongoDB credentials
   - Server ports
   - API URLs
   - Environment settings

2. **Start all services:**

   ```sh
   docker-compose up
   ```

   Or run in detached mode (background):

   ```sh
   docker-compose up -d
   ```

3. **Access the application:**

   - Frontend: http://localhost:4200
   - Backend API: http://localhost:8080
   - MongoDB: localhost:27017

### Docker Commands

**Start services:**

```sh
docker-compose up
```

**Start services in background:**

```sh
docker-compose up -d
```

**Stop services:**

```sh
docker-compose down
```

**Stop services and remove volumes (⚠️ deletes database data):**

```sh
docker-compose down -v
```

**View logs:**

```sh
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f inventory-platform
docker-compose logs -f inventory-server
docker-compose logs -f mongo
```

**Rebuild containers:**

```sh
docker-compose up --build
```

**Restart a specific service:**

```sh
docker-compose restart inventory-platform
```

### Production Build

To build and run the production version:

1. **Build the production image:**

   ```sh
   docker build -t inventory-platform:prod -f Dockerfile .
   ```

2. **Run the production container:**

   ```sh
   docker run -p 3000:3000 --env-file .env inventory-platform:prod
   ```

### Development vs Production

- **Dockerfile.dev** - Used for development with hot-reload and volume mounts
- **Dockerfile** - Used for production with optimized build and smaller image size

The `docker-compose.yml` uses `Dockerfile.dev` by default for development. To use production builds in docker-compose, you can modify the docker-compose.yml file.

### Troubleshooting

**Port already in use:**

- Check if ports 4200, 8080, or 27017 are already in use
- Modify the port mappings in `.env` file or `docker-compose.yml`

**Environment variables not loading:**

- Ensure `.env` file exists in the project root
- Check that variable names match in `.env` and `docker-compose.yml`

**Container won't start:**

- Check logs: `docker-compose logs <service-name>`
- Ensure Docker has enough resources allocated
- Try rebuilding: `docker-compose up --build`

**Database connection issues:**

- Verify MongoDB credentials in `.env` match the backend configuration
- Ensure MongoDB container is running: `docker-compose ps`

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
pnpm nx g @nx/react:app demo
```

To generate a new library, use:

```sh
pnpm nx g @nx/react:lib mylib
```

You can use `pnpm nx list` to get a list of installed plugins. Then, run `pnpm nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/tutorials/react-monorepo-tutorial?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:

- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
