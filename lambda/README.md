# Lambda Content Aggregator

This Lambda function aggregates content from multiple sources (dev.to, YouTube) and provides a single API endpoint for your portfolio.

## Benefits

1. **Reduced Client-Side API Calls**: Single request instead of multiple
2. **Better Caching**: CloudFront can cache the aggregated response
3. **API Key Security**: YouTube API key stays server-side
4. **Faster Page Load**: Pre-processed data with engagement scores
5. **Cost Effective**: Lambda free tier covers most personal portfolio traffic

## Setup Instructions

### 1. Create Lambda Function

```bash
# Create a zip file
cd lambda
zip -r function.zip content-aggregator.js

# Or use AWS CLI
aws lambda create-function \
  --function-name portfolio-content-aggregator \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler content-aggregator.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256
```

### 2. Set Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name portfolio-content-aggregator \
  --environment Variables="{YOUTUBE_CHANNEL_ID=YOUR_CHANNEL_ID,YOUTUBE_API_KEY=YOUR_API_KEY}"
```

Or set them in the AWS Console:
- Go to Lambda > Functions > portfolio-content-aggregator
- Configuration > Environment variables
- Add:
  - `YOUTUBE_CHANNEL_ID`: Your YouTube channel ID
  - `YOUTUBE_API_KEY`: Your YouTube Data API v3 key

### 3. Create Function URL (Easiest Option)

```bash
aws lambda create-function-url-config \
  --function-name portfolio-content-aggregator \
  --auth-type NONE \
  --cors AllowOrigins="*",AllowMethods="GET",MaxAge=3600
```

This gives you a URL like: `https://abc123.lambda-url.us-east-1.on.aws/`

### 4. Alternative: API Gateway

If you prefer API Gateway:

1. Create a new REST API
2. Create a GET method
3. Set integration type to Lambda Function
4. Enable CORS
5. Deploy to a stage (e.g., 'prod')

### 5. Update Your Frontend

In `src/content-manager.js`, add a method to use the Lambda endpoint:

```javascript
async fetchFromLambda() {
    const LAMBDA_URL = 'https://your-lambda-url.amazonaws.com/';
    
    try {
        const response = await fetch(LAMBDA_URL);
        const result = await response.json();
        
        if (result.success) {
            return result.data;
        }
    } catch (error) {
        console.error('Error fetching from Lambda:', error);
    }
    
    return null;
}
```

### 6. CloudFront Integration (Optional but Recommended)

Add the Lambda Function URL as an origin in your CloudFront distribution:

1. Go to CloudFront > Your Distribution > Origins
2. Create origin with Lambda Function URL
3. Create a behavior for path `/api/content`
4. Set cache policy to cache for 1 hour
5. Enable compression

Now your content API will be cached at edge locations worldwide!

## Cost Estimation

For a personal portfolio with ~1000 visitors/month:
- Lambda: FREE (well within free tier of 1M requests)
- API Gateway: ~$0.01/month (if used)
- CloudFront: Included in your existing distribution

## Testing Locally

```bash
# Install AWS SAM CLI
# Then run:
sam local invoke portfolio-content-aggregator
```

## Monitoring

Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/portfolio-content-aggregator --follow
```

## Security Notes

- Function URL has no authentication (public API)
- YouTube API key is server-side only (secure)
- Consider adding rate limiting if needed
- CloudFront provides DDoS protection

## Updating the Function

```bash
# After making changes
zip -r function.zip content-aggregator.js

aws lambda update-function-code \
  --function-name portfolio-content-aggregator \
  --zip-file fileb://function.zip
```
