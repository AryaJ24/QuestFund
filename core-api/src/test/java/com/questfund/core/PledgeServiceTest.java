package com.questfund.core;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

class PledgeServiceTest {
    @Test
    void rejectsAmountsBelowSelectedRewardMinimum() {
        CampaignService campaigns = mock(CampaignService.class);
        PledgeRepository pledges = mock(PledgeRepository.class);
        Campaign campaign = new Campaign("id", "test", "Test", "Design", "Portland", "Tagline", "Story",
            "Maker", "clay", 10_000L, Instant.now().plusSeconds(3600),
            List.of(new Campaign.RewardTier("maker", "Maker", "Workshop", 7_500L, "Seat")), List.of());
        when(campaigns.campaign("test")).thenReturn(campaign);
        PledgeService service = new PledgeService(campaigns, pledges, mock(MongoTemplate.class));

        assertThrows(ApiException.class, () -> service.create("test", new PledgeService.CreatePledge("maker", "Alex", 7_499L), true));
        verify(pledges, never()).save(any());
    }
}
