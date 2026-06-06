# Upwork submission note (draft — paste into the message)

Hi Lila,

Here's my take-home prototype: **Math Defenders**, a math tower-defense for grades 3–5.

**▶ Play:** https://math-defender.pages.dev
**Code:** https://github.com/jbotmallen/math-defender

**The game.** Lane defense (PvZ-style). Launcher plants fire a base-5 pea down each lane; you draft
and place operator plants (`+ − × ÷`) that mutate the shot in real time — placement order is the
puzzle. Drones carry a **factor shield**: damage only lands if it's an exact multiple of the factor,
otherwise it deflects. So the core loop is literally "compose the operations to hit the right
number." 3 timed waves + a final swarm per sector; defend the base, earn stars.

Hits all three criteria: it's a quick dopamine loop (fun), wave/draft escalation (addicting), and the
math *is* the mechanic rather than a quiz bolted on.

**Workflow.** I followed your 4-phase pipeline — Skill File → Design Brief → AI assets → assembly
(all documented in `/docs`). One swap: instead of Ludo AI I generated the card/sprite art with
Gemini + ChatGPT image models (and authored a few SVGs), since that was faster with no API
round-trip — same "100% AI-generated assets" outcome. Built with Claude Code + Phaser 4 / React 19.
Happy to redo the asset step through Ludo if you'd prefer the exact pipeline.

**Scope notes** (per your ground rules): single-player only, and I kept it honest about rough edges —
e.g. the enlarged drone art outpaces its physics hitbox, and PEMDAS is simplified to left-to-right
for now; both are quick fixes I've noted in the README.

Took roughly a focused session beyond the 30-min target because I leaned into the mechanic depth
and the asset art — the repeatable 30-min/game cadence is written up in `docs/WORKFLOW.md`.

Would love to walk through it. Thanks!
