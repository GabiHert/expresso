# AWS CLI Specialist Skill

A comprehensive skill for exploring and interacting with AWS resources using the AWS CLI. Focused on debugging, monitoring, and data exploration with safety-first design.

## Overview

This skill enables efficient exploration of:
- **CloudWatch Logs** - Lambda debugging, log filtering, Log Insights queries
- **S3** - Bucket navigation, file download, parquet/geospatial data analysis
- **SQS** - Queue inspection, message analysis, DLQ investigation
- **DynamoDB** - Table scanning, querying, item exploration
- **Lambda** - Function configuration, metrics, invocation analysis

## Safety Principles

### Read-Only by Default

All exploration operations are read-only and safe to execute without confirmation:
- `aws logs filter-log-events`
- `aws s3 ls`, `aws s3 cp` (download only)
- `aws sqs receive-message --visibility-timeout 0` (peek without consuming)
- `aws dynamodb scan`, `aws dynamodb query`, `aws dynamodb get-item`
- `aws lambda get-function`, `aws lambda list-functions`

### Write Operations Require Confirmation

These operations modify state and require explicit user confirmation:
- **SQS**: `send-message`, `delete-message`, `purge-queue`
- **DynamoDB**: `put-item`, `update-item`, `delete-item`
- **S3**: `cp` (upload), `rm`, `sync`
- **Lambda**: `invoke` (can trigger side effects)

Before any write operation:
1. Show exactly what will be changed
2. Require explicit "yes" confirmation
3. Display results after execution

### Environment Safety

Always confirm the target environment before operations:
```bash
# Check current AWS profile
aws sts get-caller-identity

# Verify region
aws configure get region
```

When working with multiple environments (dev/staging/prod), always:
1. Confirm the target environment with the user
2. Use explicit `--profile` and `--region` flags
3. Warn if targeting production resources

### Cost Awareness

Warn about potentially expensive operations:
- **CloudWatch Log Insights** - Charged per GB scanned
- **S3 LIST** on large buckets - Can be slow and costly
- **DynamoDB Scan** - Reads entire table, prefer Query when possible
- **Lambda Invoke** - May trigger downstream costs

## Quick Reference

### CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups --query 'logGroups[*].logGroupName'

# Tail logs (live)
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# Filter by time range (last 1 hour)
aws logs filter-log-events \
  --log-group-name /aws/lambda/FUNCTION_NAME \
  --start-time $(date -d '1 hour ago' +%s000) \
  --filter-pattern "ERROR"

# Log Insights query
aws logs start-query \
  --log-group-name /aws/lambda/FUNCTION_NAME \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 50'
```

### S3

```bash
# List buckets
aws s3 ls

# List bucket contents
aws s3 ls s3://bucket-name/prefix/ --recursive --human-readable

# Download file
aws s3 cp s3://bucket-name/path/file.parquet ./local/

# Get object metadata
aws s3api head-object --bucket bucket-name --key path/file.parquet
```

### SQS

```bash
# List queues
aws sqs list-queues

# Get queue attributes
aws sqs get-queue-attributes --queue-url QUEUE_URL --attribute-names All

# Peek at messages (without consuming)
aws sqs receive-message \
  --queue-url QUEUE_URL \
  --max-number-of-messages 10 \
  --visibility-timeout 0

# Get approximate message count
aws sqs get-queue-attributes \
  --queue-url QUEUE_URL \
  --attribute-names ApproximateNumberOfMessages
```

### DynamoDB

```bash
# List tables
aws dynamodb list-tables

# Describe table
aws dynamodb describe-table --table-name TABLE_NAME

# Scan (use sparingly)
aws dynamodb scan --table-name TABLE_NAME --limit 10

# Query by partition key
aws dynamodb query \
  --table-name TABLE_NAME \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk": {"S": "value"}}'
```

### Lambda

```bash
# List functions
aws lambda list-functions --query 'Functions[*].FunctionName'

# Get function configuration
aws lambda get-function-configuration --function-name FUNCTION_NAME

# Get recent invocations (via CloudWatch metrics)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=FUNCTION_NAME \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum
```

## Reference Documentation

Detailed patterns and examples are available in the `references/` directory:

- [CloudWatch Logs Patterns](references/cloudwatch-logs-patterns.md)
- [S3 Exploration Patterns](references/s3-exploration-patterns.md)
- [SQS Operations Patterns](references/sqs-operations-patterns.md)
- [DynamoDB Operations Patterns](references/dynamodb-operations-patterns.md)
- [Lambda Exploration Patterns](references/lambda-exploration-patterns.md)
- [MaxSatt AWS Resources](references/maxsatt-resources.md)

## Common Workflows

### Debug a Lambda Error

1. Check recent errors in logs
2. Get full stack trace
3. Check input event
4. Verify function configuration
5. Check downstream dependencies

```bash
# Step 1: Find errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/FUNCTION_NAME \
  --start-time $(date -d '1 hour ago' +%s000) \
  --filter-pattern "ERROR"

# Step 2: Get request context
aws logs filter-log-events \
  --log-group-name /aws/lambda/FUNCTION_NAME \
  --filter-pattern "REQUEST_ID"
```

### Investigate SQS Dead Letter Queue

1. Check DLQ message count
2. Peek at failed messages
3. Identify error patterns
4. Check source queue

```bash
# Check DLQ depth
aws sqs get-queue-attributes \
  --queue-url DLQ_URL \
  --attribute-names ApproximateNumberOfMessages

# Peek at messages
aws sqs receive-message \
  --queue-url DLQ_URL \
  --max-number-of-messages 5 \
  --visibility-timeout 0
```

### Analyze S3 Data

1. List bucket structure
2. Check file metadata
3. Download sample file
4. Analyze locally

```bash
# Explore structure
aws s3 ls s3://bucket/prefix/ --recursive | head -20

# Check file size
aws s3api head-object --bucket bucket --key path/file.parquet

# Download for local analysis
aws s3 cp s3://bucket/path/file.parquet ./
```

## Integration with Agents

This skill is used by the `aws-explorer` agent for:
- Proactive AWS resource exploration
- Debugging Lambda functions
- Investigating queue backlogs
- Analyzing data in S3

## Tags

`aws` `cli` `cloudwatch` `s3` `sqs` `dynamodb` `lambda` `debugging` `monitoring`
