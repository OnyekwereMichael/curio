-- The "pass today's fact check" quest pays after passing any ONE of today's facts (was: all of them).
-- Already applied to production as `learn_facts_quest_any_one_fact`; 20261116150000 was edited to match.
update public.daily_quests set target = 1 where key = 'learn_facts' and target <> 1;
