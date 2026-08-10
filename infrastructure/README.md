# Infrastructure

```
docker-compose.yml          Two profiles: default (Postgres only, for scripts/dev.sh)
                             and "prod" (full built-image stack)
docker/
  backend.Dockerfile         Multi-stage Node build
  ai-inference.Dockerfile    Python/FastAPI, preserves code/ai_services/'s relative layout
  frontend.Dockerfile        Vite build -> served by nginx
nginx/
  frontend.nginx.conf        SPA fallback + /api reverse proxy
k8s/
  *.yaml                     Plain-manifest Kubernetes deployment, see k8s/README.md
```

## Network topology, and why it looks like this

In the `prod` profile, **only the `frontend` container publishes a host
port.** `backend` and `ai-inference` use `expose` (reachable from other
containers on the compose network) rather than `ports` (reachable from the
host/internet), so the only way to reach the backend from outside is
through nginx's `/api/` reverse proxy in the frontend container, and the
only way to reach the AI service at all is from the backend.

This is the same principle the rest of the system is built around, just
applied one layer down: **the fewer things that can be reached directly,
the fewer things need to individually get their auth right.** The backend
already enforces its own auth on every route regardless (see
`code/backend/src/middleware/auth.middleware.ts`). This topology is
defense in depth on top of that, not a substitute for it.

## Usage

```bash
# Local dev: just the database, everything else runs natively for hot reload
docker compose -f infrastructure/docker-compose.yml up -d postgres

# A full, built-image stack (closer to production)
docker compose -f infrastructure/docker-compose.yml --profile prod up --build

# Add the AI service to either profile
docker compose -f infrastructure/docker-compose.yml --profile ai up -d ai-inference
```

`code/backend/.env`'s `AI_SERVICE_URL` should be `http://ai-inference:8000`
when running inside this compose network (as opposed to `http://localhost:8000`
for native `scripts/dev.sh` usage).

## Scope note

This covers single-host Docker Compose and a plain-manifest Kubernetes
deployment (`k8s/`), enough to actually run and demo the full stack on
either. It deliberately doesn't include Terraform for cloud infrastructure
(VPC, managed database, DNS). That needs a real provider and account
decision (AWS vs. GCP vs. Azure, region, existing account structure) that
shouldn't be guessed at rather than asked. Tell me which provider you're
targeting and that's a natural next piece.

CI/CD is under `../.github/workflows/`: `ci.yml` lints/typechecks/builds
every package and compiles the contracts on every push and PR;
`docker-publish.yml` builds and pushes the three runtime images to GHCR on
merges to `main` and on version tags.
