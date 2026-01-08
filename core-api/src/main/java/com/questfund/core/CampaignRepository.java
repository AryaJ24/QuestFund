package com.questfund.core;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CampaignRepository extends MongoRepository<Campaign, String> {
    Optional<Campaign> findBySlug(String slug);
}
