package com.questfund.core;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PledgeRepository extends MongoRepository<Pledge, String> {
    List<Pledge> findByCampaignIdAndStatusIn(String campaignId, List<String> statuses);
    List<Pledge> findByStatusIn(List<String> statuses);
}
