package com.questfund.core;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("pledges")
@CompoundIndex(name = "campaign_status_idx", def = "{'campaignId': 1, 'status': 1}")
public record Pledge(
    @Id String id,
    String campaignId,
    String tierId,
    String supporterName,
    long amountCents,
    String status,
    String stripeSessionId,
    Instant createdAt,
    Instant paidAt
) {}
