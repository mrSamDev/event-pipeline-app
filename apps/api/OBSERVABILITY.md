# Observability Setup

This API is instrumented with comprehensive observability using OpenTelemetry, Prometheus metrics, and structured logging for Grafana.

## Architecture

```
┌─────────────┐
│  MarTech    │
│    API      │ ──metrics──> :9464/metrics ──scrape──> Prometheus (VPS)
│             │                                              │
│             │ ──logs────> Loki (VPS)                      │
└─────────────┘                  │                           │
                                 └───────────────┬───────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │   Grafana   │
                                          │    (VPS)    │
                                          └─────────────┘
```

## Components

### 1. **OpenTelemetry Auto-Instrumentation**
Automatically instruments:
- HTTP requests (Express)
- MongoDB operations
- DNS lookups
- Network calls

**Endpoint**: `http://localhost:9464/metrics`

### 2. **Prometheus Metrics**
Custom application metrics exported in Prometheus format:

#### Event Metrics
- `martech_events_ingested_total` - Total events ingested (by type, status)
- `martech_event_ingestion_duration_seconds` - Event ingestion latency
- `martech_buffer_size` - Current buffer size
- `martech_buffer_flushes_total` - Buffer flush operations

#### Database Metrics
- `martech_db_connections` - Database connection status
- `martech_db_operation_duration_seconds` - DB operation latency

#### HTTP Metrics
- `martech_http_requests_total` - Total HTTP requests (by method, path, status)
- `martech_http_active_requests` - Active HTTP requests

#### System Metrics
- `martech_system_memory_bytes` - Memory usage
- Standard Node.js metrics (CPU, GC, etc.)

### 3. **Structured Logging (Winston + Loki)**
All logs are structured JSON with:
- Timestamp
- Log level
- Message
- Contextual metadata
- Service labels

Logs are sent to Loki for centralized log aggregation in Grafana.

## Configuration

### Environment Variables

```bash
# Prometheus metrics port (default: 9464)
PROMETHEUS_PORT=9464

# Loki endpoint for log shipping
LOKI_HOST=http://your-vps-ip:3100

# Log level: error, warn, info, debug (default: info)
LOG_LEVEL=info
```

## VPS Grafana Setup

Since you're self-hosting Grafana on a VPS, here's what you need to configure:

### 1. **Prometheus Configuration**

On your VPS, configure Prometheus to scrape the API:

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'martech-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['your-api-host:9464']
        labels:
          service: 'martech-api'
          environment: 'production'
```

### 2. **Loki Configuration**

On your VPS, ensure Loki is running and accessible:

```bash
# Loki should be listening on port 3100
curl http://localhost:3100/ready
```

Update your API's `.env` file:
```bash
LOKI_HOST=http://your-vps-ip:3100
```

### 3. **Grafana Datasources**

Add datasources in Grafana:

**Prometheus**:
- URL: `http://localhost:9090` (or your Prometheus URL)
- Access: Server (default)

**Loki**:
- URL: `http://localhost:3100` (or your Loki URL)
- Access: Server (default)

### 4. **Recommended Dashboards**

Import these Grafana dashboard IDs:
- **Node.js Application Dashboard**: 11159
- **Prometheus Stats**: 2
- **Loki Dashboard**: 13639

Or create custom dashboards using the exported metrics.

## Example Queries

### Prometheus Queries (for Grafana)

**Request Rate**:
```promql
rate(martech_http_requests_total[5m])
```

**Error Rate**:
```promql
rate(martech_http_requests_total{status=~"5.."}[5m])
```

**P95 Event Ingestion Latency**:
```promql
histogram_quantile(0.95, rate(martech_event_ingestion_duration_seconds_bucket[5m]))
```

**Active Database Connections**:
```promql
martech_db_connections{state="connected"}
```

**Buffer Size**:
```promql
martech_buffer_size
```

### Loki Queries (for Grafana)

**All Logs from API**:
```logql
{service="martech-api"}
```

**Error Logs Only**:
```logql
{service="martech-api"} |= "level":"error"
```

**Logs with Duration > 100ms**:
```logql
{service="martech-api"} | json | duration > 100ms
```

**MongoDB Errors**:
```logql
{service="martech-api"} |= "MongoDB" |= "error"
```

## Health Checks

### API Health
```bash
curl http://localhost:3000/health
```

Response includes:
- Database connection status
- Buffer size
- Memory usage
- Uptime

### Metrics Health
```bash
curl http://localhost:9464/metrics
```

Should return Prometheus-formatted metrics.

## Alerting (Grafana)

Set up alerts for:

1. **High Error Rate**
   ```promql
   rate(martech_http_requests_total{status=~"5.."}[5m]) > 0.05
   ```

2. **Database Disconnected**
   ```promql
   martech_db_connections{state="connected"} == 0
   ```

3. **High Buffer Size** (indicates ingestion bottleneck)
   ```promql
   martech_buffer_size > 1000
   ```

4. **High Memory Usage**
   ```promql
   martech_nodejs_heap_size_used_bytes / martech_nodejs_heap_size_total_bytes > 0.9
   ```

5. **No Data Received** (API down)
   ```promql
   absent(up{job="martech-api"})
   ```

## Troubleshooting

### Metrics not appearing in Prometheus?
1. Check API is exposing metrics: `curl http://localhost:9464/metrics`
2. Check Prometheus can reach API: `curl http://your-api-host:9464/metrics` from VPS
3. Check Prometheus targets: Prometheus UI → Status → Targets
4. Check firewall rules (port 9464 must be open)

### Logs not appearing in Loki?
1. Check Loki is running: `curl http://your-vps-ip:3100/ready`
2. Check API can reach Loki: `curl http://your-vps-ip:3100/ready` from API host
3. Check API logs for Loki connection errors
4. Verify `LOKI_HOST` is set correctly in `.env`

### High Memory Usage?
1. Check buffer size metric: `martech_buffer_size`
2. Check for memory leaks in Grafana dashboard
3. Adjust MongoDB connection pool size if needed
4. Review event ingestion rate

## Development

In development, observability features work locally:
- Logs go to console (colorized)
- Metrics available at `http://localhost:9464/metrics`
- Loki shipping disabled (unless `LOKI_HOST` is set)

To test with local Grafana stack:
```bash
# Run Prometheus + Loki + Grafana locally with Docker
# (You can create a docker-compose.yml if needed for local testing)
```

## Production Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Configure `LOKI_HOST` to point to VPS Loki
- [ ] Configure Prometheus on VPS to scrape API metrics endpoint
- [ ] Verify port 9464 is accessible from VPS
- [ ] Import Grafana dashboards
- [ ] Set up Grafana alerts
- [ ] Test alert notifications (Slack/Email/PagerDuty)
- [ ] Set up log retention policy in Loki
- [ ] Set up metrics retention policy in Prometheus

## Metrics Retention

**Prometheus** (on VPS):
- Default: 15 days
- Configure with `--storage.tsdb.retention.time` flag

**Loki** (on VPS):
- Configure retention in Loki config:
  ```yaml
  limits_config:
    retention_period: 744h  # 31 days
  ```

## Cost Optimization

Since you're self-hosting:
1. Adjust scrape intervals (15s → 30s or 60s) if needed
2. Use log sampling for high-volume logs
3. Set appropriate retention periods
4. Use recording rules in Prometheus for frequently queried metrics
5. Archive old metrics to object storage if needed

## Resources

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Prometheus Query Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [LogQL (Loki Query Language)](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
