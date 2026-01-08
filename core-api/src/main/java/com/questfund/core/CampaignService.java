package com.questfund.core;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CampaignService {
    private final CampaignRepository campaigns;
    private final PledgeRepository pledges;
    private static final List<String> PAID = List.of("PAID", "DEMO_PAID");

    public CampaignService(CampaignRepository campaigns, PledgeRepository pledges) {
        this.campaigns = campaigns;
        this.pledges = pledges;
    }

    public List<CampaignView> list() {
        return campaigns.findAll().stream().map(this::view).toList();
    }

    public CampaignView get(String slug) {
        return view(campaigns.findBySlug(slug).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Campaign not found")));
    }

    public Campaign campaign(String slug) {
        return campaigns.findBySlug(slug).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    public CampaignView view(Campaign campaign) {
        List<Pledge> paid = pledges.findByCampaignIdAndStatusIn(campaign.id(), PAID);
        long raised = paid.stream().mapToLong(Pledge::amountCents).sum();
        int percent = campaign.goalCents() > 0 ? (int) (raised * 100 / campaign.goalCents()) : 0;
        List<MilestoneView> milestones = campaign.milestones().stream()
            .map(m -> new MilestoneView(m.percent(), m.title(), m.description(), percent >= m.percent()))
            .toList();
        return new CampaignView(campaign.id(), campaign.slug(), campaign.title(), campaign.category(),
            campaign.location(), campaign.tagline(), campaign.story(), campaign.creator(), campaign.visual(),
            campaign.goalCents(), raised, paid.size(), percent, campaign.deadline(), campaign.tiers(), milestones);
    }

    public DashboardView dashboard() {
        List<CampaignView> views = list();
        long totalRaised = views.stream().mapToLong(CampaignView::raisedCents).sum();
        long totalBackers = views.stream().mapToLong(CampaignView::backerCount).sum();
        long unlocked = views.stream().flatMap(v -> v.milestones().stream()).filter(MilestoneView::unlocked).count();
        return new DashboardView(totalRaised, totalBackers, unlocked, views);
    }

    public record MilestoneView(int percent, String title, String description, boolean unlocked) {}
    public record CampaignView(String id, String slug, String title, String category, String location,
        String tagline, String story, String creator, String visual, long goalCents, long raisedCents,
        long backerCount, int percent, Instant deadline, List<Campaign.RewardTier> tiers,
        List<MilestoneView> milestones) {}
    public record DashboardView(long totalRaisedCents, long totalBackers, long unlockedMilestones,
        List<CampaignView> campaigns) {}
}
