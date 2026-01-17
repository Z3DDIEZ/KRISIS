# Cost Model & Budget Controls

## Executive Summary

**Monthly Budget Target**: $50-100
**Architecture**: 100% Google Cloud (optimized for free tier usage)
**Target Scale**: 1,000 users, 10,000 applications/month
**Cost Discipline**: Free tier maximized, pay-as-you-grow scaling

---

## Monthly Cost Breakdown (1,000 users, 10,000 applications/month)

| Service | Usage | Cost |
|---------|-------|------|
| **Firebase Hosting** | 10GB bandwidth | Free tier |
| **Firebase Auth** | 1,000 active users | Free tier |
| **Firestore** | 50K reads, 20K writes | $0.06 + $0.18 = $0.24 |
| **Cloud Functions** | 100K invocations | Free tier (2M/month free) |
| **Gemini API** | 10K requests | ~$10 (estimate) |
| **BigQuery** | 100MB data, 1GB queries | Free tier |
| **Cloud Logging** | 5GB logs | Free tier (50GB/month free) |
| **Cloud Storage** | 1GB storage | Free tier |
| **Total** | | **~$10-15/month** |

## Cost Optimization Strategies

### Free Tier Maximization
- Use Firestore bundle for initial data load
- Cache Gemini responses (reduce API calls)
- Enable BigQuery flat-rate pricing if needed
- Compress Cloud Storage files
- Set retention policies on logs

---

## Detailed Service Cost Analysis

### Firebase Hosting
**Current Usage**: Static SPA hosting, global CDN
**Free Tier**: 10GB/month bandwidth, 360MB storage
**Cost Trigger**: Bandwidth > 10GB ($0.15/GB)
**Optimization**: CDN caching, asset compression

### Firebase Authentication
**Current Usage**: Email/password + Google OAuth
**Free Tier**: 50K monthly active users
**Cost Trigger**: >50K MAU ($0.0055/user)
**Optimization**: Session management, no excessive token refreshes

### Firestore
**Current Usage**: 50K reads, 20K writes per month
**Free Tier**: 50K reads, 20K writes free
**Cost Structure**:
- Reads: $0.06 per 100K
- Writes: $0.18 per 100K
- Deletes: $0.02 per 100K
**Optimization**:
- Use real-time listeners judiciously
- Batch operations
- Implement pagination
- Cache frequently accessed data

### Cloud Functions (2nd Gen)
**Current Usage**: 100K invocations/month
**Free Tier**: 2M invocations free
**Cost Structure**:
- Invocations: $0.0000004 per invocation (after free tier)
- GB-seconds: $0.0000025 per GB-second
- CPU-seconds: $0.0000100 per CPU-second
**Optimization**:
- Minimize function cold starts
- Use appropriate memory allocation
- Batch processing where possible
- Optimize function runtime

### Gemini API
**Current Usage**: 10K requests/month
**Pricing**: $0.00025 per character (input), $0.0005 per character (output)
**Estimated Cost**: ~$10/month for 10K requests
**Optimization**:
- Cache analysis results
- Rate limiting per user
- Prompt optimization
- Reuse analyses for similar applications

### BigQuery
**Current Usage**: 100MB storage, 1GB queries/month
**Free Tier**: 10GB storage, 5TB queries free (100GB analysis free)
**Cost Structure**:
- Storage: $0.02/GB/month
- Queries: $5/TB processed
**Optimization**:
- Partition tables by date
- Cluster tables by user_id
- Use appropriate data types
- Schedule large queries off-peak

### Cloud Storage
**Current Usage**: Resume files, exported reports
**Free Tier**: 5GB storage, 5K operations free
**Cost Structure**:
- Storage: $0.026/GB/month
- Operations: $0.05 per 10K operations
**Optimization**:
- Compress files before upload
- Delete unused files
- Use appropriate storage classes
- Implement lifecycle policies

### Cloud Logging
**Current Usage**: 5GB logs/month
**Free Tier**: 50GB logs free
**Cost Structure**: $0.50/GB after free tier
**Optimization**:
- Set log retention policies
- Use structured logging
- Filter sensitive data
- Reduce verbose logging

---

## Cost Monitoring & Alerts

### Budget Alerts Configuration

```yaml
# budget-alerts.yaml
budgets:
  - name: monthly-budget
    amount: 100
    currency: USD
    services:
      - Firebase
      - Cloud Functions
      - Gemini API
      - BigQuery
    threshold_rules:
      - threshold_percent: 50
        spend_basis: current-spend
      - threshold_percent: 80
        spend_basis: current-spend
      - threshold_percent: 100
        spend_basis: forecasted-spend
    notification_channels:
      - email@example.com
```

### Key Cost Metrics to Monitor

**Daily Monitoring**:
- Gemini API spend
- Cloud Functions invocations
- Firestore read/write operations

**Weekly Review**:
- BigQuery storage and query costs
- Cloud Storage usage
- Total monthly spend vs budget

**Monthly Analysis**:
- Cost per user
- Cost per application
- Cost efficiency trends

---

## Scaling Cost Projections

### Phase 1 (0-1K users): Current Architecture
**Monthly Cost**: $10-15
**Key Cost Drivers**: Gemini API, minimal Firestore usage

### Phase 2 (1K-10K users): Cloud Run Addition
**Monthly Cost**: $50-100
**New Costs**: Cloud Run instances, increased Firestore usage
**Optimization**: Implement API Gateway pattern

### Phase 3 (10K-100K users): Multi-Region
**Monthly Cost**: $200-500
**New Costs**: Cross-region replication, increased BigQuery usage
**Optimization**: Implement data locality optimizations

### Phase 4 (100K+ users): Microservices
**Monthly Cost**: $1,000-5,000
**New Costs**: Service mesh, advanced monitoring
**Optimization**: Implement cost allocation by service/team

---

## Cost Control Mechanisms

### 1. User-Level Quotas
```typescript
// Per-user monthly limits
const USER_QUOTAS = {
  aiAnalyses: 50,        // Gemini API calls
  applications: 1000,    // Application creates
  exports: 10,          // Data exports
  storage: 100 * 1024 * 1024  // 100MB storage
};
```

### 2. Rate Limiting
```typescript
// API rate limits
const RATE_LIMITS = {
  aiAnalysis: '10 per hour',
  applicationCreate: '50 per day',
  dataExport: '5 per day'
};
```

### 3. Automatic Cost Controls
- Daily spend limits per service
- Automatic service disabling if budget exceeded
- Graduated quota increases based on usage history

### 4. Usage-Based Pricing Signals
- Show users their usage vs limits
- Warn before quota exhaustion
- Suggest premium tiers (future feature)

---

## Risk Mitigation

### Cost Spike Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini API cost overrun | High | Medium | Per-user quotas, caching, rate limiting |
| Firestore read/write explosion | Medium | High | Query optimization, pagination, caching |
| BigQuery query costs | Medium | Medium | Partitioning, clustering, query limits |
| Cloud Functions cold starts | Low | Medium | Memory optimization, keep-alive strategies |
| Storage accumulation | Medium | Low | Lifecycle policies, compression |

### Monitoring Dashboard

**Key Alerts**:
1. **Gemini API spend > $5/day**
2. **Cloud Functions invocations > 50K/day**
3. **Firestore operations > 10K/day**
4. **BigQuery queries > 100GB processed/day**
5. **Total spend > $50/month**

---

## Cost Optimization Roadmap

### Immediate (Phase 1)
- [x] Implement Firebase free tier usage
- [x] Add basic cost monitoring
- [x] Set up budget alerts

### Short-term (Phase 2)
- [ ] Implement user quotas
- [ ] Add caching layers
- [ ] Optimize BigQuery usage

### Medium-term (Phase 3)
- [ ] Implement cost allocation
- [ ] Add usage analytics
- [ ] Optimize for multi-region costs

### Long-term (Phase 4)
- [ ] Implement predictive cost modeling
- [ ] Add cost-aware load balancing
- [ ] Develop custom cost optimization algorithms

---

## Financial Sustainability

### Revenue Model Preparation
- Track user engagement metrics
- Monitor feature usage patterns
- Prepare for freemium to premium transition

### Break-even Analysis
**Current**: Free tier optimized, no revenue
**Target**: 1,000 paying users at $5-10/month
**Timeline**: 12-18 months post-launch

### Unit Economics
- **Cost per user**: <$0.15/month
- **Value per user**: TBD (based on engagement)
- **LTV/CAC ratio**: Target 3:1 minimum

---

## Cost Governance

### Team Responsibilities
- **Engineering**: Implement cost controls, optimize queries
- **Product**: Monitor usage patterns, design cost-aware features
- **Finance**: Set budgets, monitor spend, forecast costs

### Review Cadence
- **Daily**: Automated alerts for cost anomalies
- **Weekly**: Cost trend analysis and optimization review
- **Monthly**: Budget vs actual analysis, forecast updates
- **Quarterly**: Cost model validation, optimization strategy updates

This cost model ensures the platform remains financially viable while scaling from MVP to production SaaS.