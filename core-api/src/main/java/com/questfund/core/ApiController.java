package com.questfund.core;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class ApiController {
    private final CampaignService campaigns;
    private final PledgeService pledges;

    public ApiController(CampaignService campaigns, PledgeService pledges) {
        this.campaigns = campaigns;
        this.pledges = pledges;
    }

    @GetMapping("/api/campaigns")
    List<CampaignService.CampaignView> list() { return campaigns.list(); }

    @GetMapping("/api/campaigns/{slug}")
    CampaignService.CampaignView get(@PathVariable String slug) { return campaigns.get(slug); }

    @GetMapping("/api/dashboard")
    CampaignService.DashboardView dashboard() { return campaigns.dashboard(); }

    @PostMapping("/api/campaigns/{slug}/demo-pledges")
    ResponseEntity<Pledge> demo(@PathVariable String slug, @RequestBody PledgeService.CreatePledge input) {
        if (!demoMode) throw new ApiException(HttpStatus.NOT_FOUND, "Demo pledges are disabled");
        return ResponseEntity.status(HttpStatus.CREATED).body(pledges.create(slug, input, true));
    }

    @PostMapping("/internal/campaigns/{slug}/pledges")
    ResponseEntity<Pledge> create(@RequestHeader("X-Internal-Token") String token, @PathVariable String slug,
        @RequestBody PledgeService.CreatePledge input) {
        checkToken(token);
        return ResponseEntity.status(HttpStatus.CREATED).body(pledges.create(slug, input, false));
    }

    @GetMapping("/internal/pledges/{id}")
    Pledge pledge(@RequestHeader("X-Internal-Token") String token, @PathVariable String id) {
        checkToken(token);
        return pledges.get(id);
    }

    @PostMapping("/internal/pledges/{id}/confirm")
    Pledge confirm(@RequestHeader("X-Internal-Token") String token, @PathVariable String id,
        @RequestBody PledgeService.ConfirmPayment input) {
        checkToken(token);
        return pledges.confirm(id, input);
    }

    @org.springframework.beans.factory.annotation.Value("${questfund.internal-token}")
    private String internalToken;
    @org.springframework.beans.factory.annotation.Value("${questfund.demo-mode}")
    private boolean demoMode;

    private void checkToken(String token) {
        if (!internalToken.equals(token)) throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
