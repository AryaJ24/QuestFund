package com.questfund.core;

import java.time.Instant;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class PledgeService {
    private final CampaignService campaignService;
    private final PledgeRepository pledges;
    private final MongoTemplate mongo;

    public PledgeService(CampaignService campaignService, PledgeRepository pledges, MongoTemplate mongo) {
        this.campaignService = campaignService;
        this.pledges = pledges;
        this.mongo = mongo;
    }

    public Pledge create(String slug, CreatePledge input, boolean demo) {
        Campaign campaign = campaignService.campaign(slug);
        if (campaign.deadline().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This campaign has ended");
        }
        Campaign.RewardTier tier = campaign.tiers().stream()
            .filter(t -> t.id().equals(input.tierId()))
            .findFirst().orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid reward tier"));
        if (input.amountCents() < tier.minimumCents() || input.amountCents() > 1_000_000_00L) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Amount must meet the tier minimum and be at most $1,000,000");
        }
        String name = input.supporterName() == null ? "" : input.supporterName().trim();
        if (name.length() < 2 || name.length() > 80) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a supporter name (2–80 characters)");
        }
        Instant now = Instant.now();
        return pledges.save(new Pledge(null, campaign.id(), tier.id(), name, input.amountCents(),
            demo ? "DEMO_PAID" : "PENDING", null, now, demo ? now : null));
    }

    public Pledge get(String id) {
        return pledges.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Pledge not found"));
    }

    public Pledge confirm(String id, ConfirmPayment input) {
        Pledge pledge = get(id);
        if (pledge.amountCents() != input.amountCents()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Paid amount does not match pledge");
        }
        if (input.sessionId() == null || !input.sessionId().startsWith("cs_")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid checkout session");
        }
        Query pending = new Query(Criteria.where("_id").is(id).and("status").is("PENDING"));
        Update paid = new Update().set("status", "PAID").set("stripeSessionId", input.sessionId())
            .set("paidAt", Instant.now());
        mongo.updateFirst(pending, paid, Pledge.class);
        return get(id);
    }

    public record CreatePledge(String tierId, String supporterName, long amountCents) {}
    public record ConfirmPayment(String sessionId, long amountCents) {}
}
