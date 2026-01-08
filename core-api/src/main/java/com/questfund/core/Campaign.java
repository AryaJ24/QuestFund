package com.questfund.core;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("campaigns")
public record Campaign(
    @Id String id,
    @Indexed(unique = true) String slug,
    String title,
    String category,
    String location,
    String tagline,
    String story,
    String creator,
    String visual,
    long goalCents,
    Instant deadline,
    List<RewardTier> tiers,
    List<Milestone> milestones
) {
    public record RewardTier(String id, String title, String description, long minimumCents, String perk) {}
    public record Milestone(int percent, String title, String description) {}
}
