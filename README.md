# QuestFund

A rewards-powered crowdfunding platform for creative projects.

**Stack:** Java 17, Spring Boot, React, TypeScript, Express.js, MongoDB, Stripe API.

Backers can explore campaigns, choose reward tiers, make pledges, and track funding milestones. A creator dashboard shows campaign totals and supporter activity.

Behind the interface, the Java API validates pledges and computes progress from confirmed payments. An Express payment service creates Stripe Checkout Sessions and verifies signed webhooks. Payment confirmation is idempotent, so repeated webhook deliveries do not double-count funding.

Stripe integration is intended for test mode. Creator accounts and reward fulfillment are outside this portfolio build.
