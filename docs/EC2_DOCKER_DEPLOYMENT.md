# EC2 Docker Deployment

This stack runs:

- `frontend`: Vite React app built into static files and served by Nginx.
- `backend`: FastAPI app served by Uvicorn.
- `db`: PostgreSQL 16 with persistent Docker volume storage.

Nginx exposes the site on `HTTP_PORT` and proxies `/api/*`, `/uploads/*`, and `/health` to the backend container.

## 1. Prepare EC2

Use an Ubuntu EC2 instance. In the security group, allow:

- SSH `22` from your IP.
- HTTP `80` from the internet.
- HTTPS `443` if you add TLS later.

Install Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker
```

## 2. Configure The App

Copy the project to the EC2 instance, then create the runtime env file:

```bash
cp .env.example .env
nano .env
```

Change at least:

- `POSTGRES_PASSWORD`
- `JWT_SECRET_KEY`
- `BACKEND_CORS_ORIGINS`, for example `http://YOUR_EC2_PUBLIC_IP` or `https://your-domain.com`
- `HTTP_PORT` if port `80` is already used

## 3. Start

```bash
docker compose up -d --build
docker compose ps
```

The backend entrypoint waits for PostgreSQL and runs:

```bash
alembic upgrade head
```

The FastAPI startup then seeds demo data if the database is empty.

Open:

```text
http://YOUR_EC2_PUBLIC_IP/
```

Health check:

```bash
curl http://YOUR_EC2_PUBLIC_IP/health
```

## 4. Logs And Operations

View logs:

```bash
docker compose logs -f frontend backend db
```

Restart:

```bash
docker compose restart
```

Update after pulling new code:

```bash
docker compose up -d --build
```

Stop:

```bash
docker compose down
```

Do not use `docker compose down -v` unless you intend to delete PostgreSQL data and uploaded files.

## 5. Backup PostgreSQL

Create a backup:

```bash
set -a; . ./.env; set +a
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Restore into an empty database:

```bash
set -a; . ./.env; set +a
docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" < backup.sql
```

## 6. TLS

For production, put this stack behind an HTTPS reverse proxy or load balancer. Common EC2 options:

- AWS Application Load Balancer with ACM certificate, forwarding HTTP to the instance.
- Caddy or Nginx on the host with Let's Encrypt, forwarding to `127.0.0.1:80`.

When HTTPS is enabled, set `BACKEND_CORS_ORIGINS` to the HTTPS origin.
