# Journey System Deep Analysis

## Executive Summary

This document provides a comprehensive analysis of the journeys system's handling of:
1. **Concurrency** - How parallel job processing is managed
2. **Rate Limiting** - Strapi API request throttling
3. **Retry Mechanisms** - Job retry logic and error recovery
4. **Lock Management** - Distributed locking to prevent race conditions
5. **Race Condition Prevention** - Mechanisms to avoid duplicate work
6. **Error Handling** - Response time failures and retry strategies

---

## 1. Concurrency Handling

### 1.1 Multi-Level Concurrency Control

The system implements **three layers** of concurrency control:

#### Layer 1: RabbitMQ Prefetch
- **Location**: `apps/journeys/src/rabbitmq/index.ts:249`
- **Setting**: `RABBITMQ_PREFETCH_COUNT` (default: 10)
- **Purpose**: Limits how many unacked messages each consumer can hold
- **Impact**: Prevents overwhelming consumers with too many concurrent jobs

```typescript
// Each consumer can process up to 10 messages concurrently
await ch.prefetch(prefetchCount);
```

**Potential Issue**: 
- If `RABBITMQ_PREFETCH_COUNT` is too high relative to `adaptiveRateLimiter` concurrency, jobs may queue up waiting for rate limiter slots
- **Recommendation**: Ensure `RABBITMQ_PREFETCH_COUNT` ≤ `adaptiveRateLimiter.MAX_CONCURRENCY`

#### Layer 2: Adaptive Rate Limiter Concurrency
- **Location**: `apps/journeys/src/common/utils/adaptive-rate-limiter.ts`
- **Settings**:
  - `MIN_CONCURRENCY`: 5 (default)
  - `MAX_CONCURRENCY`: 30 (default)
  - `INITIAL_CONCURRENCY`: 10 (default)
- **Purpose**: Dynamically adjusts concurrent Strapi API requests based on response times
- **Mechanism**: Uses `p-limit` to control concurrent executions

**How it works**:
- Monitors response times in a sliding window (30 requests)
- **Ramps up** concurrency if avg response < 300ms
- **Ramps down** concurrency if avg response > 800ms
- **Circuit breaks** if avg response > 2000ms or 10 consecutive errors

**Critical Issue**: 
- The rate limiter is a **singleton** shared across all consumers
- If multiple consumers are running, they all share the same concurrency limit
- **Example**: With 3 consumers and MAX_CONCURRENCY=30, each effectively gets ~10 concurrent requests
- **Race Condition Risk**: Multiple consumers competing for the same rate limiter slots

#### Layer 3: Consumer-Level Processing
- **Location**: `apps/journeys/src/consumers/journey/job-consumer.ts`
- **Mechanism**: Each consumer processes messages sequentially per prefetch limit
- **Concurrency**: Determined by `RABBITMQ_PREFETCH_COUNT` × number of consumers

### 1.2 Concurrency Conflicts

**Problem Identified**:
1. **Shared Rate Limiter**: All consumers share one `adaptiveRateLimiter` instance
   - Multiple consumers compete for the same concurrency slots
   - No coordination between consumers
   - Can lead to uneven load distribution

2. **No Consumer-Level Rate Limiting**: 
   - Each consumer can request up to `PREFETCH_COUNT` messages
   - But they all compete for the same rate limiter slots
   - Can cause starvation if one consumer is slow

**Recommendation**:
- Consider per-consumer rate limiters OR
- Increase `MAX_CONCURRENCY` to account for multiple consumers
- Formula: `MAX_CONCURRENCY` ≥ `RABBITMQ_PREFETCH_COUNT` × `number_of_consumers`

---

## 2. Rate Limiting of Requests to Strapi

### 2.1 Adaptive Rate Limiter Implementation

**Location**: `apps/journeys/src/common/utils/adaptive-rate-limiter.ts`

**Key Features**:
1. **Dynamic Concurrency Adjustment**
   - Starts at 10 concurrent requests
   - Adjusts based on response times
   - Range: 5-30 concurrent requests

2. **Circuit Breaker Pattern**
   - Triggers when:
     - Average response time > 2000ms
     - 10 consecutive errors
     - 5 HTTP errors in a row
   - Recovery: Exponential backoff (starts at 3s, max 30s)
   - After recovery: Reduces concurrency by 30%

3. **Response Time Tracking**
   - Maintains sliding window of last 30 responses
   - Adjusts concurrency every 5+ responses
   - Tracks both successful and failed requests

### 2.2 Rate Limiter Usage Points

All Strapi API calls go through `adaptiveRateLimiter.execute()`:

1. **Contact Operations** (`process-job.ts:78-85`)
   ```typescript
   await adaptiveRateLimiter.execute(() =>
     contactsService.checkSubscription(...)
   )
   ```

2. **Composition Sending** (`process-job.ts:106-113`)
   ```typescript
   await adaptiveRateLimiter.execute(() =>
     composerService.sendComposition(...)
   )
   ```

3. **Contact Updates** (`pass-contact-to-next-step.ts:18-22, 47-56`)
   ```typescript
   await adaptiveRateLimiter.execute(() =>
     contactsService.findOne(...)
   )
   await adaptiveRateLimiter.execute(() =>
     contactsService.update(...)
   )
   ```

4. **Journey Processing** (`journey-processor.ts:128-149`)
   - Multiple calls per contact
   - Can create many concurrent requests

### 2.3 Rate Limiting Issues

**Critical Problems**:

1. **No Per-Endpoint Rate Limiting**
   - All endpoints share the same concurrency limit
   - Heavy endpoints (like `findAll` with pagination) compete with lightweight ones
   - **Risk**: One heavy query can block many lightweight operations

2. **No Request Prioritization**
   - Critical operations (like `checkSubscription`) compete with non-critical ones
   - **Risk**: Subscription checks might be delayed, causing duplicate sends

3. **Circuit Breaker Recovery Time**
   - Recovery time increases exponentially (3s → 4.5s → 6.75s → ... → 30s max)
   - During recovery, ALL requests are paused
   - **Risk**: Legitimate requests are blocked during recovery

4. **Shared State Across Consumers**
   - Multiple consumer instances share the same rate limiter state
   - Response times from one consumer affect all others
   - **Risk**: One slow consumer can trigger circuit breaker for all

**Recommendation**:
- Implement per-endpoint rate limiting
- Add request prioritization (critical vs non-critical)
- Consider distributed rate limiting (Redis-based) for multi-instance deployments

---

## 3. Retrying Jobs

### 3.1 Retry Handler Implementation

**Location**: `apps/journeys/src/lib/functions/helpers/retry-handler.ts`

**Key Features**:

1. **Exponential Backoff with Jitter**
   ```typescript
   delay = initialDelay * 2^retryCount + random(0-30% of delay)
   ```
   - Initial delay: `RABBITMQ_RETRY_INITIAL_DELAY_MS` (default: 1000ms)
   - Max delay: `RABBITMQ_RETRY_MAX_DELAY_MS` (default: 30000ms)
   - Jitter: Up to 30% random variation

2. **Retry Count Tracking**
   - Stored in message headers: `x-retry-count`
   - Max retries: `RABBITMQ_MAX_RETRIES` (default: 3)
   - Tracks first attempt time and last attempt time

3. **Smart Retry Logic**
   - **Transaction errors**: Always get delay (even for DELAYED queue)
   - **DELAYED queue errors**: Retry immediately (delay=0) unless transaction error
   - **Other queues**: Use exponential backoff

### 3.2 Retry Decision Logic

**Location**: `retry-handler.ts:153-188`

**Non-Retryable Errors**:
- Validation errors
- Not found errors
- Unauthorized/Forbidden errors
- Step type mismatches
- Missing required fields

**Retryable Errors**:
- Network errors (ECONNRESET, ETIMEDOUT, etc.)
- Transaction errors (deadlocks, aborted transactions)
- Timeout errors
- Any other transient errors

### 3.3 Retry Flow

**Location**: `consumers/journey/job-consumer.ts:84-144`

**Process**:
1. Job fails with error
2. `handleMessageRetry()` checks if retryable
3. If retryable and under max retries:
   - Republish to queue with exponential backoff delay
   - ACK original message
4. If non-retryable or max retries exceeded:
   - NACK message (send to DLX)
   - Log error

### 3.4 Retry Issues

**Critical Problems**:

1. **No Distinction Between Timeout Types**
   - High response time (e.g., 5s response) vs actual timeout (30s+)
   - Both are retried the same way
   - **Risk**: Legitimate slow responses might be retried unnecessarily

2. **DELAYED Queue Immediate Retry**
   - DELAYED queue errors retry immediately (delay=0)
   - **Risk**: If Strapi is slow, immediate retry will fail again
   - **Issue**: No backoff for DELAYED queue errors (except transaction errors)

3. **Max Retries Too Low**
   - Default: 3 retries
   - For high response time scenarios, might need more retries
   - **Risk**: Legitimate requests might be sent to DLX prematurely

4. **No Retry After Circuit Breaker**
   - When circuit breaker triggers, requests fail immediately
   - These failures are retried, but circuit breaker might still be active
   - **Risk**: Retries might fail immediately again

5. **Race Condition in Retry Republishing**
   - Original message is ACKed before republished message is confirmed
   - If republish fails, message is lost
   - **Risk**: Job might be lost if republish fails

**Recommendation**:
- Add timeout detection: distinguish between slow responses and actual timeouts
- Implement backoff for DELAYED queue errors (not just transaction errors)
- Increase max retries for timeout/network errors
- Add circuit breaker awareness to retry logic
- Use confirm channel for republished messages

---

## 4. Handling Locks

### 4.1 Distributed Lock Implementation

**Location**: `apps/journeys/src/lib/functions/helpers/distributed-lock.ts`

**Key Features**:

1. **Redis-Based Locks**
   - Uses Redis `SETNX` (SET if Not eXists) for atomic lock acquisition
   - Lock value: `timestamp-random` for uniqueness
   - TTL: Configurable (default: 60s)

2. **Lock Extension**
   - Automatically extends lock TTL for long operations
   - Extension interval: 50% of TTL (for locks > 10s)
   - Prevents lock expiration during long operations

3. **Safe Release**
   - Uses Lua script to ensure only lock owner can release
   - Prevents accidental release by wrong process

### 4.2 Lock Usage Points

1. **Job Creation** (`create-job.ts:72-76`)
   - Lock key: `job-contact:{contactId}-journey:{journeyId}-step:{stepId}`
   - Purpose: Prevent duplicate job creation
   - TTL: 30 days (same as job key expiration)

2. **Contact Updates** (`pass-contact-to-next-step.ts:80-94`)
   - Lock key: `contact-update:journey:{journeyId}`
   - Purpose: Prevent concurrent updates to same journey
   - TTL: 120 seconds (accounts for rate limiting delays)

3. **Journey Scheduling** (`schedule-journeys.ts:52-54`)
   - Lock key: `journey-scheduler:lock`
   - Purpose: Prevent concurrent scheduler execution
   - TTL: 300 seconds (5 minutes)

### 4.3 Lock Retry Logic

**Location**: `pass-contact-to-next-step.ts:96-146`

**Retry Strategy**:
- Max retries: 5
- Base delay: 2000ms (accounts for rate limiter)
- Exponential backoff with jitter: `baseDelay + (500-1000ms) * retryCount`
- If all retries fail: Throws error (triggers job retry)

### 4.4 Lock Issues

**Critical Problems**:

1. **Lock TTL Mismatch**
   - Job creation lock uses 30-day TTL
   - But job key in Redis also expires in 30 days
   - **Risk**: Lock might expire before job completes, allowing duplicate jobs

2. **No Lock Extension for Job Creation**
   - Job creation lock doesn't extend TTL
   - If job processing takes > 30 days, lock expires
   - **Risk**: Duplicate jobs can be created after lock expires

3. **Lock Contention**
   - All contacts in same journey share one lock (`contact-update:journey:{journeyId}`)
   - High-traffic journeys can cause lock contention
   - **Risk**: Contacts might wait unnecessarily for lock

4. **Lock Release on Error**
   - If operation fails, lock is released
   - But job might be retried, acquiring lock again
   - **Risk**: No issue here, but worth noting

5. **Lock Extension Race Condition**
   - Lock extension checks if lock value matches
   - If another process acquires lock between extension checks, extension fails silently
   - **Risk**: Lock might expire if extension fails

**Recommendation**:
- Reduce job creation lock TTL to match actual job processing time
- Add lock extension for job creation locks
- Consider per-contact locks instead of per-journey locks (if Strapi supports it)
- Add monitoring for lock contention

---

## 5. Race Condition Prevention

### 5.1 Race Condition Prevention Mechanisms

1. **Atomic Job Key Creation**
   - **Location**: `check-job-exists.ts:24-37`
   - Uses Redis `SETNX` to atomically create job keys
   - Prevents duplicate job creation
   - **Key Format**: `job-contact:{contactId}-journey:{journeyId}-step:{stepId}`

2. **Distributed Locks**
   - Prevents concurrent updates to same resource
   - Used for contact updates and journey scheduling

3. **Atomic Redis Operations**
   - Journey scheduling uses `SET NX EX` for atomic scheduling
   - Prevents duplicate journey processing

### 5.2 Race Condition Scenarios

#### Scenario 1: Duplicate Job Creation
**Problem**: Multiple consumers try to create same job simultaneously

**Prevention**:
- `setJobKeyAtomic()` uses Redis `SETNX`
- Only one consumer succeeds
- Others skip job creation

**Remaining Risk**:
- If job key expires (30 days) but job is still processing
- Another job can be created
- **Mitigation**: Job keys should expire after job completion, not fixed 30 days

#### Scenario 2: Concurrent Contact Updates
**Problem**: Multiple contacts updating same journey simultaneously

**Prevention**:
- Distributed lock per journey
- Only one contact updates at a time
- Others retry with backoff

**Remaining Risk**:
- Lock contention can cause delays
- If lock TTL expires during operation, another contact can acquire lock
- **Mitigation**: Lock extension mechanism (already implemented)

#### Scenario 3: Duplicate Journey Scheduling
**Problem**: Multiple scheduler instances run simultaneously

**Prevention**:
- Distributed lock: `journey-scheduler:lock`
- Only one scheduler runs at a time

**Remaining Risk**:
- If scheduler crashes while holding lock, next run waits for TTL (5 minutes)
- **Mitigation**: Lock TTL is reasonable (5 minutes)

#### Scenario 4: Job Processing Race Condition
**Problem**: Same job processed by multiple consumers

**Prevention**:
- RabbitMQ ensures each message is delivered to only one consumer
- Prefetch limit prevents one consumer from taking all messages

**Remaining Risk**:
- If consumer crashes after processing but before ACK, message is redelivered
- Job might be processed twice
- **Mitigation**: Job keys prevent duplicate processing (if checked)

### 5.3 Race Condition Issues

**Critical Problems**:

1. **Job Key Expiration vs Job Processing Time**
   - Job keys expire in 30 days
   - But jobs might process faster or slower
   - **Risk**: If job takes > 30 days, duplicate jobs can be created

2. **No Idempotency Check in Processors**
   - `processJobMessage()` doesn't check if job was already processed
   - Relies on job key creation to prevent duplicates
   - **Risk**: If job key expires, duplicate processing can occur

3. **Contact Update Race Condition**
   - `passContactToNextStep()` reads contact, modifies, then updates
   - Between read and update, another process might modify contact
   - **Risk**: Lost updates (though lock mitigates this)

4. **Journey Processing Race Condition**
   - `processJourneyMessage()` processes contacts in parallel
   - Multiple contacts might create jobs for same step simultaneously
   - **Risk**: Duplicate jobs (mitigated by atomic job key creation)

**Recommendation**:
- Add idempotency checks in processors
- Reduce job key TTL or make it dynamic based on job type
- Consider optimistic locking for contact updates (version field)
- Add monitoring for duplicate job detection

---

## 6. Error Handling for High Response Times

### 6.1 Current Error Handling

**Location**: `process-job.ts`, `retry-handler.ts`

**Current Behavior**:
1. If Strapi responds slowly (> 2000ms avg), circuit breaker triggers
2. Circuit breaker pauses all requests for 3-30 seconds
3. Failed requests are retried with exponential backoff
4. After max retries, jobs are sent to DLX

### 6.2 High Response Time Scenarios

#### Scenario 1: Slow but Successful Response
**Problem**: Strapi responds in 5 seconds, but request succeeds

**Current Behavior**:
- Response time is recorded
- If avg > 2000ms, circuit breaker triggers
- But this specific request succeeded
- **Issue**: Successful requests are penalized by circuit breaker

**Impact**:
- Circuit breaker pauses all requests
- Legitimate slow requests are blocked
- Can cause cascading delays

#### Scenario 2: Timeout (No Response)
**Problem**: Strapi doesn't respond within timeout (30s+)

**Current Behavior**:
- Request times out
- Error is caught and retried
- Retry happens immediately (for DELAYED queue) or with backoff

**Issue**:
- No distinction between slow response and timeout
- Both are retried the same way
- Timeout errors might need different handling

#### Scenario 3: Partial Response (Connection Reset)
**Problem**: Connection is reset mid-response

**Current Behavior**:
- HTTP error detected
- Retried with exponential backoff
- Circuit breaker might trigger if 5 HTTP errors in a row

**Issue**:
- Connection reset might indicate temporary issue
- But retry might happen too quickly

### 6.3 Error Handling Issues

**Critical Problems**:

1. **No Timeout Configuration**
   - No explicit timeout for Strapi requests
   - Relies on network/HTTP timeouts
   - **Risk**: Requests might hang indefinitely

2. **Circuit Breaker Too Aggressive**
   - Triggers on avg response > 2000ms
   - But some legitimate operations might take > 2s
   - **Risk**: Legitimate requests are blocked

3. **No Distinction Between Error Types**
   - Slow response vs timeout vs error all treated similarly
   - **Risk**: Wrong retry strategy for different error types

4. **Retry After Circuit Breaker**
   - When circuit breaker is active, requests fail immediately
   - These failures are retried
   - **Risk**: Retries fail immediately again, wasting resources

5. **No Response Time Monitoring**
   - Response times are tracked but not logged/monitored
   - **Risk**: Can't identify slow endpoints or patterns

**Recommendation**:
- Add explicit timeouts for Strapi requests (e.g., 30s)
- Distinguish between slow responses and timeouts
- Adjust circuit breaker thresholds based on endpoint
- Skip retries when circuit breaker is active (or use longer backoff)
- Add monitoring/alerting for high response times

---

## 7. Recommendations Summary

### 7.1 High Priority Fixes

1. **Fix Job Key Expiration**
   - Make job key TTL dynamic based on job type
   - Or reduce TTL and extend on job processing
   - **Impact**: Prevents duplicate jobs

2. **Add Timeout Configuration**
   - Add explicit timeouts for all Strapi requests
   - Default: 30 seconds
   - **Impact**: Prevents hanging requests

3. **Improve Retry Logic for DELAYED Queue**
   - Add backoff for DELAYED queue errors (not just transaction errors)
   - **Impact**: Prevents immediate retry failures

4. **Add Idempotency Checks**
   - Check if job was already processed before processing
   - **Impact**: Prevents duplicate processing

5. **Distinguish Error Types**
   - Separate slow responses from timeouts from errors
   - Use different retry strategies
   - **Impact**: Better error handling

### 7.2 Medium Priority Improvements

1. **Per-Endpoint Rate Limiting**
   - Different concurrency limits for different endpoints
   - **Impact**: Better resource utilization

2. **Request Prioritization**
   - Prioritize critical operations (subscription checks)
   - **Impact**: Prevents duplicate sends

3. **Distributed Rate Limiting**
   - Use Redis for rate limiting across multiple instances
   - **Impact**: Better coordination between consumers

4. **Lock Monitoring**
   - Add metrics for lock contention
   - **Impact**: Identify bottlenecks

5. **Circuit Breaker Improvements**
   - Skip retries when circuit breaker is active
   - Or use longer backoff
   - **Impact**: Prevents wasted retries

### 7.3 Low Priority Enhancements

1. **Response Time Monitoring**
   - Log slow requests
   - Alert on high response times
   - **Impact**: Better observability

2. **Per-Consumer Rate Limiting**
   - Each consumer has its own rate limiter
   - **Impact**: Better load distribution

3. **Optimistic Locking**
   - Use version fields for contact updates
   - **Impact**: Better concurrency

---

## 8. Potential Race Conditions and Duplicate Work

### 8.1 Identified Race Conditions

1. **Job Creation Race Condition**
   - **Scenario**: Two consumers try to create same job
   - **Prevention**: Atomic job key creation
   - **Remaining Risk**: If job key expires, duplicate jobs possible

2. **Contact Update Race Condition**
   - **Scenario**: Two contacts update same journey
   - **Prevention**: Distributed lock
   - **Remaining Risk**: Lock contention causes delays

3. **Journey Scheduling Race Condition**
   - **Scenario**: Multiple schedulers run simultaneously
   - **Prevention**: Distributed lock
   - **Remaining Risk**: Low (lock TTL is reasonable)

4. **Job Processing Race Condition**
   - **Scenario**: Same job processed twice
   - **Prevention**: RabbitMQ message delivery + job keys
   - **Remaining Risk**: If consumer crashes after processing, job redelivered

### 8.2 Duplicate Work Scenarios

1. **Duplicate Job Creation**
   - **Cause**: Job key expiration
   - **Impact**: Same job processed twice
   - **Mitigation**: Fix job key expiration

2. **Duplicate Contact Updates**
   - **Cause**: Lock expiration during update
   - **Impact**: Lost updates
   - **Mitigation**: Lock extension (already implemented)

3. **Duplicate Journey Processing**
   - **Cause**: Scheduler lock expiration
   - **Impact**: Journey processed twice
   - **Mitigation**: Lock TTL is reasonable

4. **Retry Republishing Race Condition**
   - **Cause**: Original message ACKed before republish confirmed
   - **Impact**: Job lost if republish fails
   - **Mitigation**: Use confirm channel for republishing

---

## 9. Conclusion

The journeys system has **solid foundations** for handling concurrency, rate limiting, retries, and locks. However, there are **several critical issues** that can lead to:

1. **Race conditions** (duplicate jobs, lost updates)
2. **Inefficient retries** (immediate retries for DELAYED queue)
3. **Poor error handling** (no timeout configuration, aggressive circuit breaker)
4. **Resource contention** (shared rate limiter, lock contention)

**Key Takeaways**:
- Job key expiration is the biggest risk for duplicate jobs
- Rate limiter sharing across consumers can cause uneven load
- Retry logic needs improvement for DELAYED queue errors
- Error handling needs better distinction between error types
- Timeout configuration is missing

**Next Steps**:
1. Fix job key expiration (high priority)
2. Add timeout configuration (high priority)
3. Improve retry logic (high priority)
4. Add idempotency checks (high priority)
5. Implement per-endpoint rate limiting (medium priority)
6. Add monitoring and alerting (medium priority)
