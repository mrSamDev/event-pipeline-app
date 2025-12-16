#!/bin/bash

# Distributed load testing script for 5M RPS
# This script helps coordinate multiple k6 instances across different machines

set -e

API_URL="${API_URL:-http://localhost:3000}"
DURATION="${DURATION:-60s}"
INSTANCES="${INSTANCES:-10}"
RPS_PER_INSTANCE=$((5000000 / INSTANCES))

echo "=========================================="
echo "Distributed Load Test Configuration"
echo "=========================================="
echo "Target API: $API_URL"
echo "Duration: $DURATION"
echo "Total Instances: $INSTANCES"
echo "RPS per Instance: $RPS_PER_INSTANCE"
echo "Total RPS: 5,000,000"
echo "=========================================="
echo ""

if ! command -v k6 &> /dev/null; then
    echo "ERROR: k6 is not installed"
    echo "Install with: brew install k6  (macOS)"
    echo "Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo "Starting load test..."
echo "Press Ctrl+C to stop all instances"
echo ""

PIDS=()

for i in $(seq 1 $INSTANCES); do
    echo "Starting instance $i/$INSTANCES (RPS: $RPS_PER_INSTANCE)..."

    k6 run \
        --quiet \
        --tag instance=$i \
        -e API_URL=$API_URL \
        -e RPS=$RPS_PER_INSTANCE \
        --duration $DURATION \
        load-test.js > "load-test-$i.log" 2>&1 &

    PIDS+=($!)
    sleep 1
done

echo ""
echo "All instances started. Waiting for completion..."
echo "Monitor logs: tail -f load-test-*.log"
echo ""

cleanup() {
    echo ""
    echo "Stopping all instances..."
    for pid in "${PIDS[@]}"; do
        kill $pid 2>/dev/null || true
    done

    echo "Aggregating results..."
    cat load-test-*.log | grep -E "(http_req_duration|http_req_failed|http_reqs)" || true

    echo ""
    echo "Individual logs saved as: load-test-1.log ... load-test-$INSTANCES.log"
}

trap cleanup EXIT INT TERM

for pid in "${PIDS[@]}"; do
    wait $pid || true
done

echo ""
echo "Load test completed!"
