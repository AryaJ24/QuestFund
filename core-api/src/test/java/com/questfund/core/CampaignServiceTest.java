package com.questfund.core;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class CampaignServiceTest {
    @Test
    void progressOnlyCountsPaidPledgesAndUnlocksEarnedMilestones() {
        CampaignRepository campaigns = mock(CampaignRepository.class);
        PledgeRepository pledges = mock(PledgeRepository.class);
        Campaign campaign = new Campaign("id", "test", "Test", "Design", "Portland", "Tagline", "Story",
            "Maker", "clay", 10_000L, Instant.now().plusSeconds(3600), List.of(),
            List.of(new Campaign.Milestone(25, "First", "First milestone"),
                new Campaign.Milestone(75, "Second", "Second milestone")));
        when(pledges.findByCampaignIdAndStatusIn(eq("id"), anyList())).thenReturn(List.of(
            new Pledge("one", "id", "tier", "A", 3_000L, "PAID", "cs_one", Instant.now(), Instant.now()),
            new Pledge("two", "id", "tier", "B", 2_000L, "DEMO_PAID", null, Instant.now(), Instant.now())));

        var view = new CampaignService(campaigns, pledges).view(campaign);
        assertEquals(5_000L, view.raisedCents());
        assertEquals(2, view.backerCount());
        assertEquals(50, view.percent());
        assertTrue(view.milestones().get(0).unlocked());
        assertFalse(view.milestones().get(1).unlocked());
    }
}
