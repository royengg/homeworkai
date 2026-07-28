# Deploying HomeworkAI on Coolify

The production stack is defined in `compose.yml` and contains:

- `frontend`: the only public service; Nginx serves the React build and proxies
  `/api/*` and `/health` to the private backend.
- `backend`: the private Express API on port 3000.
- `worker`: the BullMQ analysis worker, built from the same backend image.
- `redis`: a private persistent Redis 7.4 instance.

Before Express opens its HTTP port, the backend entrypoint safely synchronizes
the Prisma schema with retry handling. It never supplies Prisma's destructive
`--accept-data-loss` option.

PostgreSQL and object storage are external services. The existing Neon database
and Cloudflare R2 bucket can be used directly.

## Coolify setup

1. Create a resource from this Git repository and select **Docker Compose** as
   the build pack.
2. Use `/` as the base directory and `/compose.yml` as the Compose location.
3. In the `frontend` service, assign the public domain (for example,
   `https://homework.example.com`). It listens on container port 80, so the
   domain does not need an explicit port.
4. Add all required environment variables shown by Coolify. Copy the names
   from `.env.coolify.example`; use secrets as runtime variables, not build
   variables.
5. Set `ALLOWED_ORIGINS` to the exact public frontend origin, with no trailing
   slash (for example, `https://homework.example.com`).
6. Deploy. Do not assign public domains or host port mappings to `backend`,
   `worker`, or `redis`.

Coolify terminates TLS and forwards traffic to the frontend. The frontend then
proxies API requests internally, so login cookies and API calls remain
same-origin.

## DNS and object-storage CORS

Point the chosen domain's DNS record at the Coolify VPS before requesting HTTPS.
Coolify will provision the TLS certificate after the domain resolves.

Redis recommends enabling memory overcommit on the VPS so background
persistence cannot fail under memory pressure. Run this once as root on the
server and persist the same setting in `/etc/sysctl.conf`:

```bash
sysctl -w vm.overcommit_memory=1
```

The browser uploads files directly to object storage using presigned URLs.
Configure the R2/S3 bucket CORS policy to allow the same frontend origin and at
least the `PUT`, `GET`, and `HEAD` methods with the `Content-Type` header.

## Local Compose verification

For an isolated infrastructure smoke test, use the test overlay. It starts an
ephemeral PostgreSQL container and uses only non-secret placeholder
credentials:

```bash
docker compose \
  --env-file .env.compose.test \
  -f compose.yml \
  -f compose.test.yaml \
  up --build
```

Open `http://localhost:8080`; API requests are routed through Nginx. The
placeholder object-storage and Gemini credentials intentionally do not support
real uploads or model calls.

To exercise the stack with real external services instead, use
`compose.local.yaml` with a private environment file containing the required
production-style values.

Stop the local stack without deleting Redis data:

```bash
docker compose \
  --env-file .env.compose.test \
  -f compose.yml \
  -f compose.test.yaml \
  down
```

Add `--volumes` only when you intentionally want to erase the local Redis queue
data.
