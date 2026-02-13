# DeploymentGuide

Production deployment guide for CozoDB Connector.

## Deployment Options

### Option 1: Docker (Recommended)

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

ENV NODE_ENV=production
ENV LOG_LEVEL=info

EXPOSE 3000
CMD ["node", "your-server.js"]
```

**Build and run**:

```bash
docker build -t cozodb-app .
docker run -d \
  -p 3000:3000 \
  -v /data:/app/data \
  -e LOG_LEVEL=info \
  --name cozodb-app \
  cozodb-app
```

### Option 2: systemd (Linux)

```ini
# /etc/systemd/system/cozodb-app.service
[Unit]
Description=CozoDB Application
After=network.target

[Service]
Type=simple
User=cozodb
WorkingDirectory=/opt/cozodb-app
Environment=NODE_ENV=production
Environment=LOG_LEVEL=info
Environment=DB_PATH=/var/lib/cozodb/data.db
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Deploy**:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cozodb-app
sudo systemctl start cozodb-app
sudo systemctl status cozodb-app
```

### Option 3: PM2

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start server.js \
  --name cozodb-app \
  --instances 2 \
  --env production

# Save config
pm2 save
pm2 startup
```

## Environment Variables

| Variable         | Default       | Description                       |
| ---------------- | ------------- | --------------------------------- |
| `NODE_ENV`       | `development` | Environment mode                  |
| `LOG_LEVEL`      | `info`        | Log level (debug/info/warn/error) |
| `DB_PATH`        | `./data.db`   | Database file path (SQLite)       |
| `DB_BACKEND`     | `sqlite`      | Backend (memory/sqlite/rocksdb)   |
| `MAX_QUERY_SIZE` | `10000`       | Max query length (bytes)          |
| `PORT`           | `3000`        | Server port (if applicable)       |

## Health Check

Implement a health check endpoint:

```javascript
const { CozoDb } = require("cozo-node");
const express = require("express");

const app = express();
const db = new CozoDb("sqlite", process.env.DB_PATH || "./data.db");

app.get("/health", async (req, res) => {
  try {
    await db.run("?[a] <- [[1]]");
    res.json({ status: "healthy", timestamp: Date.now() });
  } catch (error) {
    res.status(503).json({ status: "unhealthy", error: error.message });
  }
});

app.listen(process.env.PORT || 3000);
```

**Check**:

```bash
curl http://localhost:3000/health
```

## Backup & Restore

### SQLite Backend

```bash
# Backup
sqlite3 data.db ".backup data-backup-$(date +%Y%m%d).db"

# Automated daily backup (cron)
0 2 * * * sqlite3 /var/lib/cozodb/data.db ".backup /backups/data-$(date +\%Y\%m\%d).db"

# Restore
cp data-backup-20260213.db data.db
```

### RocksDB Backend

```bash
# Backup (copy entire directory)
tar czf rocksdb-backup-$(date +%Y%m%d).tar.gz rocksdb-data/

# Restore
tar xzf rocksdb-backup-20260213.tar.gz
```

## Monitoring

### Logs

```bash
# Docker
docker logs -f cozodb-app

# systemd
journalctl -u cozodb-app -f

# PM2
pm2 logs cozodb-app
```

### Metrics

See [scripts/metrics.js](../scripts/metrics.js) for Prometheus-compatible metrics.

Expose metrics endpoint:

```javascript
app.get("/metrics", (req, res) => {
  const metrics = require("./scripts/metrics");
  res.set("Content-Type", "text/plain");
  res.send(metrics.export());
});
```

## Security Checklist

- [ ] Use latest Node.js LTS version
- [ ] Run as non-root user
- [ ] Set `LOG_LEVEL=info` (not debug) in production
- [ ] Enable firewall (only expose necessary ports)
- [ ] Regular security updates: `npm audit fix`
- [ ] Backup database regularly
- [ ] Monitor disk usage (SQLite/RocksDB grow over time)
- [ ] Rate limit API endpoints (if applicable)

## Scaling

For high traffic:

1. **Read replicas** — Use multiple SQLite read-only copies
2. **Caching** — Cache frequent queries (Redis/Memcached)
3. **Load balancing** — Multiple instances behind nginx/HAProxy
4. **Sharding** — Use `createTenantManager` for multi-tenant isolation

## Troubleshooting

### High memory usage

```bash
# Check memory
free -h
docker stats cozodb-app

# Restart if needed
systemctl restart cozodb-app
pm2 restart cozodb-app
```

### Database locked (SQLite)

```bash
# Check processes holding lock
lsof data.db

# Force close if safe
kill -9 <PID>
```

### Disk full

```bash
# Check disk usage
df -h

# Clean old backups
find /backups -name "data-*.db" -mtime +30 -delete
```

## CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    tags:
      - "v*"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t cozodb-app:${{ github.ref_name }} .
      - name: Push to registry
        run: docker push cozodb-app:${{ github.ref_name }}
```
