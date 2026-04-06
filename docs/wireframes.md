# NEXUS Wireframes

**Version:** 0.1  
**Date:** 2026-04-06  
**Context:** Text wireframes for the first coherent product surface

---

## 1. Product UI Principles

These wireframes assume the current product thesis:

- `TAO EVM only`
- `v0` is a launchpad + billing layer + dashboard for paid AI/data agents
- ranking is based on business quality, not hype
- creators and buyers should understand value in under 30 seconds

Design goals:

1. Make the product feel like launching and buying software, not reading a token whitepaper.
2. Show revenue and verification early and often.
3. Keep the first-use flow short for both creators and buyers.
4. Preserve room for a later token layer without making it central in `v0`.

---

## 2. Information Architecture

Primary screens:

1. Landing + Marketplace
2. Agent Profile
3. Create Agent Flow
4. Creator Dashboard
5. Buyer Billing + Usage

Shared navigation:

- `Marketplace`
- `Create`
- `Dashboard`
- `Docs`
- `Connect Wallet`

Shared persistent UI:

- top nav
- wallet badge
- network badge: `TAO EVM`
- notification tray

---

## 3. Screen 1: Landing + Marketplace

### Goal

Communicate the wedge immediately and move users into one of two paths:

- `Launch an agent`
- `Use an agent`

### Desktop Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ NEXUS     Marketplace  Create  Dashboard  Docs       TAO EVM  Wallet │
├──────────────────────────────────────────────────────────────────────┤
│ HERO                                                                │
│ "Launch paid AI/data agents with transparent revenue on TAO EVM."   │
│ [Launch Agent] [Explore Agents]                                     │
│                                                                    │
│ KPI STRIP                                                           │
│ Active Agents | Verified Revenue | Paying Buyers | Requests / 7d    │
├──────────────────────────────────────────────────────────────────────┤
│ FEATURED AGENTS                                                     │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                         │
│ │ Wallet Mon │ │ Research   │ │ Risk Scan  │                         │
│ │ 142 TAO/mo │ │ 116 TAO/mo │ │ 89 TAO/mo  │                         │
│ │ 94% verif. │ │ 91% verif. │ │ 73% verif. │                         │
│ └────────────┘ └────────────┘ └────────────┘                         │
├──────────────────────────────────────────────────────────────────────┤
│ MARKETPLACE FILTERS                                                 │
│ Category | Verified Only | Price Range | Sort                       │
├──────────────────────────────────────────────────────────────────────┤
│ AGENT TABLE / CARD GRID                                             │
│ Name | Category | Price | Buyers | Revenue | Verification | Action   │
├──────────────────────────────────────────────────────────────────────┤
│ "How it works"                                                      │
│ 1. Deposit TAO  2. Get credits  3. Call agent  4. Revenue settles   │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Content Blocks

Hero:

- headline
- 1-line explanation
- CTA for creators
- CTA for buyers

Trust strip:

- `TAO EVM only`
- `metered revenue`
- `verified revenue score`
- `no self-reported earnings`

Featured cards:

- name
- tagline
- price model
- gross revenue
- verified revenue %
- repeat buyer rate
- action button

### Critical Actions

- `Launch Agent`
- `View Agent`
- `Deposit TAO`

### Empty / Early State

If marketplace is small:

- show 3 curated launch agents
- add label: `Founding Cohort`
- emphasize quality over scale

### Mobile Notes

- hero collapses into one CTA stack
- filters become a slide-over panel
- card list replaces table

---

## 4. Screen 2: Agent Profile

### Goal

Convince a buyer that a single agent is:

- useful
- trustworthy
- already monetizing
- easy to start using

### Desktop Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Back to Marketplace                                                 │
├──────────────────────────────────────────────────────────────────────┤
│ AGENT HEADER                                                        │
│ Wallet Monitor                                                      │
│ "Track treasury flows and suspicious wallet behavior."              │
│ [Deposit TAO] [Get API Key] [Try Demo]                              │
│ Verification: 94% | Buyers: 34 | Uptime: 99.4%                      │
├──────────────────────────────────────────────────────────────────────┤
│ LEFT COLUMN                         │ RIGHT COLUMN                  │
│ Revenue chart (7d / 30d)            │ Pricing                       │
│ Requests chart                      │ 0.015 TAO / alert pack        │
│ Verified revenue progression        │ Deposit credits               │
│                                     │ Buy plan / one-off            │
├─────────────────────────────────────┼───────────────────────────────┤
│ Sample Output                       │ Usage Details                 │
│ JSON / report / scan output         │ Endpoint URL                  │
│                                     │ Request format                │
│                                     │ Response format               │
├─────────────────────────────────────┼───────────────────────────────┤
│ Recent Activity                     │ Trust Box                     │
│ new buyer / settlement / milestone  │ revenue source explanation    │
│                                     │ verification methodology      │
├──────────────────────────────────────────────────────────────────────┤
│ Footer CTA: Start Using This Agent                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Core Modules

Header:

- name
- short description
- creator name or badge
- category badge
- verification status

Charts:

- gross revenue
- paid requests
- verification %

Sample output:

- the most convincing artifact on the page
- should be readable without needing to sign in

Trust box:

- `Revenue is metered through Nexus`
- `Settled on TAO EVM`
- `Verification score explanation`

### Critical Actions

- `Deposit TAO`
- `Get API Key`
- `Try Demo`

### Important States

High-trust state:

- green/strong verification badge
- revenue visible
- repeat buyers visible

Manual review state:

- amber badge
- explanation: `Some revenue still under review`

---

## 5. Screen 3: Create Agent Flow

### Goal

Get a creator from zero to deployable agent in under 15 minutes.

### Flow Structure

Step 1: Choose Template  
Step 2: Define Inputs + Output  
Step 3: Configure Pricing  
Step 4: Preview Public Profile  
Step 5: Deploy

### Step 1: Choose Template

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Create Agent                                                        │
│ Step 1 of 5                                                         │
├──────────────────────────────────────────────────────────────────────┤
│ [Monitoring Agent] [Research Agent] [Data Enrichment Agent]         │
│                                                                     │
│ Each card shows:                                                    │
│ - what it does                                                      │
│ - ideal buyer                                                       │
│ - sample revenue model                                              │
│ - example output                                                    │
├──────────────────────────────────────────────────────────────────────┤
│ [Continue]                                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Step 2: Define Inputs + Output

Fields:

- agent name
- tagline
- description
- prompt / system behavior
- input schema
- output schema
- tools enabled
- sample output

UI notes:

- left side: form
- right side: live preview of output/sample response

### Step 3: Configure Pricing

Fields:

- price per request
- monthly plan
- free trial calls
- max output size / rate limit

Important helper text:

- `You are charging in TAO`
- `Revenue is metered by Nexus`
- `You cannot self-report usage`

### Step 4: Preview Public Profile

Preview modules:

- header card
- pricing card
- sample output
- trust explanation

This step should answer:

- does this look buyable?
- does the value prop make sense fast?

### Step 5: Deploy

Final confirmation:

- wallet
- network = `TAO EVM`
- pricing summary
- platform fee
- verification expectations

CTA:

- `Deploy Agent`

Success screen:

- live profile URL
- endpoint URL
- dashboard link
- optional waitlist for tokenization

---

## 6. Screen 4: Creator Dashboard

### Goal

Let the creator understand business performance without leaving the product.

### Desktop Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Creator Dashboard                                                   │
│ Agent Switcher                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ KPI ROW                                                             │
│ Gross Revenue | Net Revenue | Paid Requests | Verified Revenue      │
├──────────────────────────────────────────────────────────────────────┤
│ Revenue Trend                 │ Verification Trend                  │
│ chart                         │ chart                               │
├───────────────────────────────┼──────────────────────────────────────┤
│ Credit / Balance Status       │ Settlement Feed                     │
│ outstanding credits           │ last settlement                     │
│ pending settlement            │ fee sweep                           │
│ payout schedule               │ warnings                            │
├───────────────────────────────┼──────────────────────────────────────┤
│ Request Analytics             │ Top Buyers / Cohorts                │
│ requests by day               │ repeat rate                         │
│ latency / success rate        │ conversion                          │
├──────────────────────────────────────────────────────────────────────┤
│ Action Row: Edit Agent | Pause Agent | Export Logs | Docs           │
└──────────────────────────────────────────────────────────────────────┘
```

### Required Modules

KPIs:

- gross revenue
- net revenue
- paid requests
- verified revenue %

Financial modules:

- current billing status
- settlement cadence
- platform fee share

Operational modules:

- uptime
- request failures
- abuse flags

Trust modules:

- verification history
- revenue confidence explanation

### Important States

Healthy:

- positive trend
- verified badge
- no warnings

Review pending:

- some revenue under manual verification
- amber banner

Low performance:

- low repeat buyers
- zero revenue streak warning

---

## 7. Screen 5: Buyer Billing + Usage

### Goal

Make buying and using agents feel simple and software-native.

### Layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Buyer Wallet                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ TAO Credit Balance                                                  │
│ [Deposit 1 TAO] [Deposit 3 TAO] [Deposit 5 TAO]                     │
├──────────────────────────────────────────────────────────────────────┤
│ Active Agents Used                                                  │
│ Wallet Monitor | Research Agent | Risk Scanner                      │
├──────────────────────────────────────────────────────────────────────┤
│ Transaction History                                                 │
│ Deposit                                                             │
│ Request Charge                                                      │
│ Settlement / Refund                                                 │
├──────────────────────────────────────────────────────────────────────┤
│ API Keys                                                            │
│ Create key | revoke key | usage caps                                │
└──────────────────────────────────────────────────────────────────────┘
```

### Notes

- this can live as a tab under dashboard in `v0`
- billing should not require reading contracts to understand cost
- show both `TAO` and optional fiat equivalent for clarity

---

## 8. Screen States To Design Explicitly

These states need intentional UX, not just happy-path screens:

1. wallet not connected
2. no credits
3. insufficient credits
4. provider unavailable / fallback path
5. agent under review
6. verified revenue badge
7. delisted or paused agent
8. no sample output yet

---

## 9. Suggested Design System Direction

Visual direction:

- warm, high-trust, premium
- not cyberpunk noise
- not degen meme launchpad aesthetics

Visual ingredients:

- expressive serif headlines
- disciplined sans for product surfaces
- warm neutrals with one strong accent
- glassy elevated cards only where useful
- charts that feel like operator dashboards, not trading casino UIs

Tone:

- product confidence
- financial clarity
- operational trust

---

## 10. Build Order For UI

If we convert this into real frontend work, build in this order:

1. Landing + marketplace shell
2. Agent profile
3. Buyer billing widget
4. Create flow
5. Creator dashboard

Reason:

- the marketplace and agent profile explain the product fastest
- billing makes the business loop legible
- create flow matters after trust is clear
