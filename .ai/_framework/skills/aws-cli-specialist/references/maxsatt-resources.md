# MaxSatt AWS Resources

Complete inventory of MaxSatt satellite imagery processing pipeline AWS resources.

## Region: us-west-2 (Primary)

### Lambda Functions

| Function Name | Description | Triggers |
|--------------|-------------|----------|
| `maxsatt-forest-event-trigger` | Processes forest monitoring events | SQS: forest-event-trigger-queue |
| `maxsatt-scheduler-trigger` | Handles scheduled processing tasks | SQS: forest-scheduler-queue |
| `maxsatt-forest-completion-trigger` | Handles completion events | SNS: forest-events-topic |
| `maxsatt-image-analysis-trigger` | Analyzes satellite imagery | S3 events |
| `maxsatt-image-raw-dataset-trigger` | Processes raw satellite datasets | S3 events |
| `maxsatt-image-delta-dataset-trigger` | Computes delta/change detection | S3 events |
| `maxsatt-image-clean-dataset-trigger` | Cleans and preprocesses imagery | S3 events |
| `maxsatt-image-climate-dataset-trigger` | Processes climate-related data | S3 events |
| `maxsatt-forest-image-fetcher` | Fetches satellite images from providers | Invoked by other Lambdas |
| `maxsatt-forest-notification-discord-trigger` | Sends Discord notifications | SNS events |
| `maxsatt-pmtiles-parser-trigger` | Parses PMTiles for map rendering | S3 events |

### Log Groups

```bash
# List all MaxSatt log groups
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/maxsatt \
  --query 'logGroups[*].logGroupName'
```

Log group naming pattern: `/aws/lambda/{function-name}`

### S3 Buckets

| Bucket | Region | Purpose |
|--------|--------|---------|
| `maxsatt-processing` | us-west-2 | Main processing bucket for satellite imagery |
| `maxsatt-pmtiles` | us-east-1 | PMTiles storage for map rendering |

#### maxsatt-processing Structure

```
maxsatt-processing/
├── raw/                    # Raw satellite imagery
│   └── {provider}/{date}/
├── processed/              # Processed imagery
│   └── {analysis-type}/{date}/
├── datasets/               # Generated datasets
│   ├── delta/
│   ├── clean/
│   └── climate/
└── results/                # Analysis results
    └── {forest-id}/{date}/
```

### SQS Queues

| Queue | Purpose | DLQ |
|-------|---------|-----|
| `maxsatt-forest-event-trigger-queue` | Forest event processing | Yes |
| `maxsatt-forest-scheduler-queue` | Scheduled task processing | Yes |
| `maxsatt-forest-scheduler-cancel-queue` | Cancellation requests | Yes |

#### Queue URLs

```bash
# Get queue URLs
aws sqs list-queues --queue-name-prefix maxsatt
```

### DynamoDB Tables

| Table | Purpose | Key Schema |
|-------|---------|------------|
| `maxsatt.scheduler-config` | Scheduler configuration | PK: config-id |

```bash
# Describe table
aws dynamodb describe-table --table-name maxsatt.scheduler-config
```

### SNS Topics

| Topic | Purpose |
|-------|---------|
| `forest-events-topic` | Forest processing event notifications |

```bash
# List topics
aws sns list-topics --query 'Topics[?contains(TopicArn, `forest`)]'
```

## Region: us-east-1 (Secondary)

### S3 Buckets

| Bucket | Purpose |
|--------|---------|
| `maxsatt-pmtiles` | PMTiles storage for CloudFront distribution |

## Common Operations

### Debug Forest Event Processing

```bash
# Check recent errors in forest-event-trigger
aws logs filter-log-events \
  --log-group-name /aws/lambda/maxsatt-forest-event-trigger \
  --start-time $(date -d '1 hour ago' +%s000) \
  --filter-pattern "ERROR"

# Check queue depth
aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url --queue-name maxsatt-forest-event-trigger-queue --query QueueUrl --output text) \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible
```

### Check Scheduler Status

```bash
# Check scheduler config
aws dynamodb scan --table-name maxsatt.scheduler-config --limit 10

# Check scheduler queue
aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url --queue-name maxsatt-forest-scheduler-queue --query QueueUrl --output text) \
  --attribute-names All
```

### Monitor Processing Pipeline

```bash
# Check all Lambda error rates
for fn in maxsatt-forest-event-trigger maxsatt-scheduler-trigger maxsatt-image-analysis-trigger; do
  echo "=== $fn ==="
  aws logs filter-log-events \
    --log-group-name /aws/lambda/$fn \
    --start-time $(date -d '1 hour ago' +%s000) \
    --filter-pattern "ERROR" \
    --query 'events[*].message' \
    --output text | head -5
done
```

### Investigate DLQ Messages

```bash
# Check forest-event DLQ
DLQ_URL=$(aws sqs get-queue-url --queue-name maxsatt-forest-event-trigger-queue-dlq --query QueueUrl --output text 2>/dev/null)
if [ -n "$DLQ_URL" ]; then
  aws sqs get-queue-attributes \
    --queue-url $DLQ_URL \
    --attribute-names ApproximateNumberOfMessages
fi
```

### Explore S3 Data

```bash
# List recent processing results
aws s3 ls s3://maxsatt-processing/results/ --recursive | tail -20

# Check raw imagery
aws s3 ls s3://maxsatt-processing/raw/

# Download sample for analysis
aws s3 cp s3://maxsatt-processing/datasets/delta/latest.parquet ./
```

## Environment Variables

Common Lambda environment variables:
- `PROCESSING_BUCKET`: maxsatt-processing
- `PMTILES_BUCKET`: maxsatt-pmtiles
- `EVENT_QUEUE_URL`: SQS queue URL
- `SCHEDULER_TABLE`: maxsatt.scheduler-config
- `DISCORD_WEBHOOK_URL`: Discord notification endpoint

## Monitoring Dashboard

Key metrics to monitor:
1. Lambda invocation counts and errors
2. SQS queue depth (backlog)
3. DLQ message counts (failures)
4. S3 object counts and sizes
5. Lambda duration and memory usage

```bash
# Quick health check
echo "=== Queue Depths ==="
for q in maxsatt-forest-event-trigger-queue maxsatt-forest-scheduler-queue; do
  URL=$(aws sqs get-queue-url --queue-name $q --query QueueUrl --output text 2>/dev/null)
  if [ -n "$URL" ]; then
    COUNT=$(aws sqs get-queue-attributes --queue-url $URL --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text)
    echo "$q: $COUNT messages"
  fi
done
```
