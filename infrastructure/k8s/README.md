# Kubernetes manifests

Plain YAML, no Helm/Kustomize — applied in filename order:

```
00-namespace.yaml
10-secrets.template.yaml    # fill in and apply as a copy, or generate via kubectl (see file)
15-backend-configmap.yaml
20-postgres.yaml            # self-managed; swap for a managed DB in real production
30-backend.yaml             # ClusterIP only
40-ai-inference.yaml        # ClusterIP only, never referenced by the Ingress — reachable only from backend
50-frontend.yaml            # ClusterIP only
60-ingress.yaml             # the ONLY manifest that exposes anything publicly
```

## Apply

```bash
kubectl apply -f 00-namespace.yaml
kubectl create secret generic predictron-secrets --namespace predictron \
  --from-literal=DATABASE_URL='postgresql://predictron:REAL_PASSWORD@postgres:5432/predictron' \
  --from-literal=SESSION_JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=POSTGRES_PASSWORD='REAL_PASSWORD'
kubectl apply -f 15-backend-configmap.yaml
kubectl apply -f 20-postgres.yaml
kubectl apply -f 30-backend.yaml
kubectl apply -f 40-ai-inference.yaml
kubectl apply -f 50-frontend.yaml
kubectl apply -f 60-ingress.yaml
```

Replace `ghcr.io/OWNER/predictron-*` in `30-backend.yaml`, `40-ai-inference.yaml`,
and `50-frontend.yaml` with your actual image path (the `docker-publish.yml`
workflow pushes to `ghcr.io/<repository_owner>/predictron-<service>`).

## Network topology

Exactly one `Ingress`, pointed at exactly one `Service` (`frontend`).
`backend` and `ai-inference` are `ClusterIP` — reachable from other pods in
the namespace, unreachable from outside the cluster, by construction rather
than by a firewall rule someone has to remember to keep updated. This is
the same shape as `infrastructure/nginx/frontend.nginx.conf` in the Docker
Compose setup, just expressed as Kubernetes objects instead of an nginx
`location` block.

## What's intentionally not here

No Helm chart, no Kustomize overlays for multiple environments, no
HorizontalPodAutoscaler, no NetworkPolicy objects formalizing the ClusterIP
boundary above (a NetworkPolicy would enforce it at the CNI level, not just
"no Ingress route exists" — a reasonable next hardening step), no
migration Job (currently `npx prisma migrate deploy` is a manual step
before rolling out a new backend image). All real next steps for taking
this from "runs on a cluster" to "production-hardened on a cluster," scoped
out here rather than guessed at.
