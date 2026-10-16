# ⚡ PulseMERN — Production DevOps & AWS Deployment Blueprint

[![Docker](https://img.shields.io/badge/Docker-24.0+-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-ECR%20%7C%20EC2%20%7C%20SSM%20%7C%20OIDC-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2022%20%2B%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%207.0-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Cache-Redis%207.4-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Security](https://img.shields.io/badge/Security-Trivy%20Vulnerability%20Scan-blue?logo=security)](https://trivy.dev/)

A production-ready full-stack MERN (MongoDB, Express, React, Node.js) reference architecture designed specifically for mastering **Docker containerization**, **multi-stage micro-images**, **zero-trust network isolation**, and **automated continuous deployment to AWS using GitHub Actions, ECR, and AWS Systems Manager (SSM)** without exposing SSH keys or ports.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Key DevOps Features](#-key-devops-features)
- [Project Structure](#-project-structure)
- [Local Quickstart](#-local-quickstart)
  - [Prerequisites](#prerequisites)
  - [Setup \& Run with Docker Compose](#setup--run-with-docker-compose)
  - [Verifying Health \& Containers](#verifying-health--containers)
- [Container Architecture Deep-Dive](#-container-architecture-deep-dive)
  - [Multi-Stage Nginx Frontend](#1-multi-stage-nginx-frontend)
  - [Hardened Node.js Backend](#2-hardened-nodejs-backend)
  - [Network Segmentation](#3-network-segmentation)
- [AWS Cloud Deployment Guide](#-aws-cloud-deployment-guide)
  - [1. AWS Infrastructure Prerequisites](#1-aws-infrastructure-prerequisites)
  - [2. Passwordless OIDC Role Setup](#2-passwordless-oidc-role-setup)
  - [3. GitHub Secrets Configuration](#3-github-secrets-configuration)
  - [4. CI/CD Pipeline Workflow Walkthrough](#4-cicd-pipeline-workflow-walkthrough)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Day-2 Operations \& Troubleshooting](#-day-2-operations--troubleshooting)

---

## 🏛 Architectural Overview

```
                                      Internet
                                         │
                                   Port 80 (HTTP)
                                         ▼
                 ┌─────────────────────────────────────────────────┐
                 │       nginx-proxy (Alpine Nginx 1.27)           │
                 │   - Serves React 19 SPA (Static Assets)         │
                 │   - Reverse proxies /api/*                      │
                 │   - Healthcheck: /healthz                       │
                 └───────┬─────────────────────────────────┬───────┘
                         │                                 │
           frontend-net  │                                 │
     (Isolated Network)  │                                 │
                         ▼                                 │
                 ┌───────────────────────────────┐         │
                 │   api-server (Node.js 22)     │         │
                 │   - Express API (Port 5000)   │         │
                 │   - Deep Healthcheck          │         │
                 │   - Non-root user `node`      │         │
                 └───────┬──────────────┬────────┘         │
                         │              │                  │
            backend-net  │              │                  │
     (internal: true)    │              │                  │
                         ▼              ▼                  │
                 ┌─────────────┐  ┌─────────────┐          │
                 │   MongoDB   │  │ Redis Cache │          │
                 │   v7.0      │  │ v7.4-Alpine │          │
                 │   Auth On   │  │ LRU Evict   │          │
                 └──────┬──────┘  └──────┬──────┘          │
                        │                │                 │
                  mongo-data        redis-data             │
                   (Volume)          (Volume)              │
                                                           ▼
                                                Zero Host Port Exposure
                                              (MongoDB & Redis are hidden)
```

---

## ✨ Key DevOps Features

| Feature | Implementation | Benefit |
| :--- | :--- | :--- |
| **Multi-Stage Builds** | Node build discarded in frontend; only static assets bundled into Nginx (~25MB) | Minimal attack surface, rapid deployment |
| **Non-Root Execution** | `USER node` inside backend container | Prevents privilege escalation attacks |
| **Zero-Trust Networks** | `backend-net` set to `internal: true` | MongoDB and Redis have zero outbound/inbound internet access |
| **No Host Port Leakage** | Only Nginx port `80` mapped to host; backend, MongoDB, and Redis are private | Strict perimeter security |
| **Layer-2 Health Checks** | Native Node `fetch` on backend; `mongosh` ping on DB; `redis-cli` ping on cache | Automated dependency orchestration in Compose |
| **Keyless AWS CI/CD** | GitHub Actions AWS OIDC authentication (`assume-role-with-web-identity`) | No long-lived AWS IAM access keys stored in GitHub |
| **Automated Vulnerability Scan** | Aqua Security Trivy integrated in GitHub Actions | Pipeline breaks on critical CVEs before deployment |
| **Zero-SSH EC2 Deployment** | AWS Systems Manager (SSM) agent executes pull and update | No SSH port 22 opened on EC2 Security Groups |
| **Zero-Downtime Clean Up** | Node `SIGTERM` / `SIGINT` graceful connection teardown | Clean DB disconnects and cache flushes |

---

## 📂 Project Structure

```text
pulse-mern/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated CI/CD (OIDC -> ECR -> Trivy -> SSM to EC2)
├── backend/
│   ├── src/
│   │   └── index.js            # Express API, MongoDB connection, Redis cache-aside logic
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile              # Multi-stage build with non-root user & native health check
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── nginx/
│   │   └── default.conf        # Nginx reverse proxy, security headers & SPA fallback
│   ├── src/
│   │   ├── App.jsx             # React UI showing live task data & cache hit source
│   │   └── main.jsx
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile              # Multi-stage Vite builder -> Alpine Nginx runner
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .env.example                # Sample environment variables
├── .gitignore                  # Tailored gitignore for MERN + Docker + OS/Editors
├── docker-compose.yml          # Production-grade 4-service topology with resource limits
└── README.md                   # Complete architectural and operational manual
```

---

## 🚀 Local Quickstart

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)
- Git

### Setup & Run with Docker Compose

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/pulse-mern.git
   cd pulse-mern
   ```

2. **Initialize Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   *(Optionally customize `MONGO_USER` and `MONGO_PASSWORD` in `.env`)*

3. **Build and Launch All Containers:**
   ```bash
   docker compose up -d --build
   ```

4. **Access the Application:**
   - Web Application: [http://localhost](http://localhost)
   - Nginx Health Probe: [http://localhost/healthz](http://localhost/healthz)
   - API Deep Health Probe: [http://localhost/api/health](http://localhost/api/health)
   - API Tasks Endpoint: [http://localhost/api/tasks](http://localhost/api/tasks)

---

### Verifying Health & Containers

Check container statuses, resource limits, and health checks:
```bash
docker compose ps
```

*Expected output:*
```text
NAME          IMAGE                    COMMAND                  SERVICE       CREATED         STATUS                   PORTS
nginx-proxy   local/pulse-mern-web     "/docker-entrypoint.…"   nginx-proxy   1 minute ago    Up 1 minute (healthy)    0.0.0.0:80->80/tcp
api-server    local/pulse-mern-api     "docker-entrypoint.s…"   api-server    1 minute ago    Up 1 minute (healthy)    5000/tcp
mongodb       mongo:7.0                "docker-entrypoint.s…"   mongodb       1 minute ago    Up 1 minute (healthy)    27017/tcp
redis-cache   redis:7.4-alpine         "docker-entrypoint.s…"   redis-cache   1 minute ago    Up 1 minute (healthy)    6379/tcp
```

Inspect live container logs:
```bash
# Stream logs from all services
docker compose logs -f

# Stream only API logs
docker compose logs -f api-server
```

---

## 🔍 Container Architecture Deep-Dive

### 1. Multi-Stage Nginx Frontend
The frontend uses a 2-stage build:
- **Stage 1 (Builder):** Uses `node:22-alpine` to install dependencies via `npm ci` and compile static production assets with Vite (`/app/dist`).
- **Stage 2 (Runner):** Uses lightweight `nginx:1.27-alpine` (~25MB). Node and `node_modules` are completely dropped. Nginx serves static HTML/JS/CSS, handles client-side routing fallback (`try_files $uri $uri/ /index.html`), attaches security headers (`X-Frame-Options`, `X-Content-Type-Options`), and proxies API requests seamlessly to `http://api-server:5000/api/`.

### 2. Hardened Node.js Backend
- **Layer Caching:** Copies `package.json` and `package-lock.json` first, running `npm ci --omit=dev` to exclude development tools.
- **Security:** Chowns the app directory to built-in non-root `node:node` and executes with `USER node`.
- **Healthcheck:** Uses native Node 18+ `fetch` inside a `HEALTHCHECK` directive, avoiding third-party utilities like `curl` or `wget`.
- **Graceful Teardown:** Listens for `SIGTERM` and `SIGINT` to close the HTTP server and gracefully disconnect MongoDB and Redis before process termination.

### 3. Network Segmentation
- **`frontend-net` (Bridge):** Connects `nginx-proxy` and `api-server`.
- **`backend-net` (Bridge, Internal):** Connects `api-server`, `mongodb`, and `redis-cache`. Configured with `internal: true`, which blocks outbound external internet access and prevents any port mapping to the host system.

---

## ☁️ AWS Cloud Deployment Guide

This project features a battle-tested CI/CD pipeline using **GitHub Actions**, **Amazon ECR**, and **AWS Systems Manager (SSM)**.

### 1. AWS Infrastructure Prerequisites

1. **Amazon EC2 Instance:**
   - Amazon Linux 2023 or Ubuntu 22.04 LTS.
   - Attach IAM Role with `AmazonSSMManagedInstanceCore` policy.
   - Install Docker & Docker Compose:
     ```bash
     sudo dnf update -y && sudo dnf install -y docker
     sudo systemctl enable --now docker
     sudo usermod -aG docker ec2-user
     # Install Compose plugin
     sudo mkdir -p /usr/local/lib/docker/cli-plugins/
     sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
     sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
     ```
   - Clone repo to `/opt/pulse-mern` and set up the production `.env`:
     ```bash
     sudo mkdir -p /opt/pulse-mern
     sudo chown -R ec2-user:ec2-user /opt/pulse-mern
     cd /opt/pulse-mern
     # Copy docker-compose.yml and .env here
     ```

2. **Amazon ECR Repositories:**
   Create two private repositories in your preferred AWS region (e.g., `ap-south-1`):
   - `pulse-mern-api`
   - `pulse-mern-web`

---

### 2. Passwordless OIDC Role Setup

To avoid storing static AWS credentials in GitHub, configure an **IAM OpenID Connect (OIDC) Identity Provider**:

1. In IAM Console, add Identity Provider:
   - **Provider Type:** OpenID Connect
   - **Provider URL:** `https://token.actions.githubusercontent.com`
   - **Audience:** `sts.amazonaws.com`

2. Create an IAM Role for GitHub Actions (e.g., `github-actions-pulse-mern-role`) with the following trust policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<YOUR_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:<YOUR_GITHUB_USERNAME>/pulse-mern:*"
           }
         }
       }
     ]
   }
   ```

3. Attach permissions to push to ECR and send SSM commands:
   - `AmazonEC2ContainerRegistryPowerUser`
   - Custom policy granting `ssm:SendCommand`, `ssm:GetCommandInvocation`, and `ssm:WaitCommandExecuted` on the target EC2 instance.

---

### 3. GitHub Secrets Configuration

In your GitHub repository, navigate to **Settings** > **Secrets and variables** > **Actions** and add:

| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `AWS_OIDC_ROLE_ARN` | `arn:aws:iam::123456789012:role/github-actions-pulse-mern-role` | ARN of the IAM role configured with OIDC |

In [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml), configure the environment variables:
```yaml
env:
  AWS_REGION: ap-south-1              # Your target AWS region
  EC2_INSTANCE_ID: i-0123456789abcdef0 # Your target EC2 Instance ID
```

---

### 4. CI/CD Pipeline Workflow Walkthrough

When you push to the `main` branch, [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml) performs:

```
[git push main]
       │
       ▼
1. Authenticate with AWS via OIDC (Temporary STS Token)
       │
       ▼
2. Build Docker images with GHA Layer Caching
       │
       ▼
3. Run Trivy Vulnerability Scanner (Fails build on CRITICAL vulnerabilities)
       │
       ▼
4. Push versioned immutable tags (Git SHA) & `latest` to Amazon ECR
       │
       ▼
5. Send AWS SSM RunShellScript to target EC2:
       ├── Authenticates Docker with ECR
       ├── Pulls fresh images: pulse-mern-web & pulse-mern-api
       ├── Runs zero-downtime rolling update: docker compose up -d
       └── Prunes orphaned/dangling images
```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Cache / Source |
| :--- | :--- | :--- | :--- |
| `GET` | `/healthz` | Lightweight Nginx status probe | Nginx in-memory |
| `GET` | `/api/health` | Deep health check (checks MongoDB & Redis connectivity) | Live Database & Cache |
| `GET` | `/api/tasks` | Returns list of tasks | Redis cache (60s TTL) or MongoDB |
| `POST` | `/api/tasks` | Creates a new task and invalidates the Redis `tasks_list` cache | Writes to MongoDB |

---

## 🛠 Day-2 Operations & Troubleshooting

### Stopping Containers
```bash
# Stop containers without losing database volume data
docker compose down

# Stop and wipe database data volumes
docker compose down -v
```

### Inspecting Service Logs
```bash
# Follow logs of API server
docker compose logs -f api-server

# Follow logs of Redis cache
docker compose logs -f redis-cache
```

### Executing Commands Inside Running Containers
```bash
# Test Redis cache key directly
docker compose exec redis-cache redis-cli keys "*"

# Ping MongoDB database
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Triggering Manual Rolling Reload on Production Host
```bash
docker compose pull nginx-proxy api-server
docker compose up -d --no-build --remove-orphans
docker image prune -f
```

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.
