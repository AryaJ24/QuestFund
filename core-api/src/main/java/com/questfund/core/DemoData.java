package com.questfund.core;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DemoData implements CommandLineRunner {
    private final CampaignRepository campaigns;
    private final PledgeRepository pledges;
    @Value("${questfund.demo-mode}") private boolean demoMode;

    public DemoData(CampaignRepository campaigns, PledgeRepository pledges) {
        this.campaigns = campaigns;
        this.pledges = pledges;
    }

    @Override
    public void run(String... args) {
        if (!demoMode || campaigns.count() > 0) return;
        seed(new Campaign(null, "wildwood-studio", "Wildwood Studio", "Design", "Portland, OR",
            "A neighborhood ceramics studio built for curious hands.",
            "We are transforming an old storefront into a warm, accessible ceramics studio. Your support funds wheels, kilns, community classes, and a sliding scale membership for neighbors who need it.",
            "Maya Chen", "clay", 2_400_000L, Instant.now().plus(29, ChronoUnit.DAYS),
            List.of(new Campaign.RewardTier("spark", "A little spark", "A heartfelt thank-you and studio updates.", 2_500L, "Digital thank-you"),
                new Campaign.RewardTier("maker", "The maker", "Get your hands in clay at our opening workshop.", 7_500L, "Workshop seat"),
                new Campaign.RewardTier("founder", "Founding member", "A handmade mug and first access to classes.", 15_000L, "Handmade mug + early access")),
            List.of(new Campaign.Milestone(25, "First wheel funded", "Our first pottery wheel is on its way."),
                new Campaign.Milestone(50, "Community classes", "Free introductory classes are unlocked."),
                new Campaign.Milestone(100, "Doors open", "The full studio buildout is funded."))), 42, 1_632_000L);

        seed(new Campaign(null, "sunroom-press", "Sunroom Press", "Publishing", "Brooklyn, NY",
            "An independent print journal about the places we call home.",
            "Sunroom is a tactile, independently published journal filled with stories, photography, and illustrations from emerging artists. Help us print issue one and pay every contributor fairly.",
            "Noah Rivera", "paper", 1_200_000L, Instant.now().plus(18, ChronoUnit.DAYS),
            List.of(new Campaign.RewardTier("reader", "Early reader", "A digital copy of issue one.", 1_800L, "Digital issue"),
                new Campaign.RewardTier("print", "The print edition", "A first-run copy delivered to your door.", 4_500L, "Print journal"),
                new Campaign.RewardTier("patron", "Studio patron", "Signed issue and an invite to our launch night.", 10_000L, "Signed issue + invite")),
            List.of(new Campaign.Milestone(25, "Writers commissioned", "Our first stories can begin."),
                new Campaign.Milestone(75, "Print run secured", "Issue one is headed to the printer."),
                new Campaign.Milestone(100, "Launch night", "We celebrate our contributors together."))), 87, 1_092_000L);

        seed(new Campaign(null, "moss-and-moon", "Moss & Moon", "Food & Drink", "Austin, TX",
            "Small-batch botanical sodas made for the long way home.",
            "We blend familiar fruit with unexpected botanicals to make a soda worth slowing down for. This campaign helps us scale our first small batch and bring it to independent shops.",
            "Ari Williams", "citrus", 3_500_000L, Instant.now().plus(41, ChronoUnit.DAYS),
            List.of(new Campaign.RewardTier("taste", "First taste", "A thank-you and behind-the-scenes recipes.", 2_000L, "Recipe notes"),
                new Campaign.RewardTier("sixpack", "The first six-pack", "Try our launch flavors before anyone else.", 6_000L, "Six-pack"),
                new Campaign.RewardTier("table", "At our table", "A tasting night with the founders.", 20_000L, "Tasting invitation")),
            List.of(new Campaign.Milestone(25, "First batch", "Ingredients and bottles are funded."),
                new Campaign.Milestone(50, "Local delivery", "We can stock our first partner shops."),
                new Campaign.Milestone(100, "Cheers to everyone", "The full launch is funded."))), 26, 1_470_000L);
    }

    private void seed(Campaign source, int backers, long raisedCents) {
        Campaign campaign = campaigns.save(source);
        long each = raisedCents / backers;
        for (int i = 0; i < backers; i++) {
            long amount = i == backers - 1 ? raisedCents - each * (backers - 1) : each;
            pledges.save(new Pledge(null, campaign.id(), campaign.tiers().get(0).id(),
                "Community backer " + (i + 1), amount, "DEMO_PAID", null,
                Instant.now().minus(10 + i, ChronoUnit.HOURS), Instant.now().minus(10 + i, ChronoUnit.HOURS)));
        }
    }
}
