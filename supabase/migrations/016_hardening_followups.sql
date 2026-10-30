-- ============================================================
-- 016_hardening_followups.sql
-- Kudos R&R Platform — Follow-ups from the Supabase security/performance
-- advisors after applying 011-015 to the hosted project.
-- ============================================================
-- 1. Supabase's default privileges grant EXECUTE on every new public
--    function to anon/authenticated directly (not only via PUBLIC), so the
--    REVOKE ... FROM PUBLIC in earlier migrations left trigger functions
--    and internal helpers exposed under /rest/v1/rpc. Trigger functions
--    can't do anything when called that way, but they shouldn't be listed.
--    Revoking EXECUTE doesn't affect triggers: the privilege is only
--    checked when a trigger is created, not when it fires.
-- 2. Pin search_path on the remaining analytics functions from 003/008.
-- 3. Indexes for foreign keys that are actually used in lookups/deletes.
--
-- Helpers referenced from RLS policies keep EXECUTE for the roles whose
-- queries evaluate those policies: get_user_org / get_user_role /
-- community_is_admin / is_api_client (anon included — public tables like
-- catalog_items reach `users` policies), community_same_org /
-- community_is_participant (authenticated only — anon has no access to
-- community tables).
-- ============================================================

-- ------------------------------------------------------------ 1. EXECUTE grants
DO $$
DECLARE
    fn TEXT;
BEGIN
    FOREACH fn IN ARRAY ARRAY[
        -- trigger functions
        'public.handle_new_user()',
        'public.notify_kudos_received()',
        'public.notify_points_credited()',
        'public.notify_badge_awarded()',
        'public.protect_user_privileged_columns()',
        'public.notifications_before_update()',
        'public.community_on_org_created()',
        'public.community_profiles_before_write()',
        'public.community_posts_before_insert()',
        'public.community_posts_dedupe()',
        'public.community_posts_before_update()',
        'public.community_posts_after_update()',
        'public.community_comments_before_insert()',
        'public.community_comments_before_update()',
        'public.community_comments_before_delete()',
        'public.community_comments_after_change()',
        'public.community_comments_after_removed()',
        'public.community_comments_notify()',
        'public.community_content_after_delete()',
        'public.community_likes_before_insert()',
        'public.community_post_likes_after_change()',
        'public.community_post_likes_reputation()',
        'public.community_comment_likes_after_change()',
        'public.community_comment_likes_reputation()',
        'public.community_bookmarks_before_insert()',
        'public.community_messages_before_insert()',
        'public.community_messages_rate_limit()',
        'public.community_messages_after_insert()',
        'public.community_messages_notify()',
        'public.community_contributions_after_insert()',
        'public.community_reports_before_insert()',
        -- internal helpers never called over the API
        'public.community_seed_categories(uuid)',
        'public.community_on_comment_removed(uuid, uuid)',
        'public.community_refresh_question_status(uuid)',
        'public.community_notify(uuid, text, text, text, text, uuid, text, boolean)',
        'public.community_credit(uuid, text, integer, uuid, uuid)',
        'public.community_check_badges(uuid)',
        'public.community_require_admin()',
        'public.check_and_award_badges(uuid)'
    ]
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    END LOOP;

    -- Callable by signed-in users only (they check auth.uid() / role inside).
    FOREACH fn IN ARRAY ARRAY[
        'public.community_same_org(uuid)',
        'public.community_is_participant(uuid)',
        'public.update_redemption_status(uuid, text)',
        'public.community_accept_answer(uuid)',
        'public.community_reopen_question(uuid)',
        'public.community_start_conversation(uuid)',
        'public.community_mark_conversation_read(uuid)',
        'public.community_list_conversations()',
        'public.community_unread_message_count()',
        'public.community_directory(text, text, text, uuid, integer, integer)',
        'public.community_org_skills()',
        'public.community_moderate(text, uuid, text, text)',
        'public.community_resolve_report(uuid, text, text)',
        'public.community_award_badge(uuid, text, text)',
        'public.community_hr_overview(integer)',
        'public.community_top_contributors(integer, integer)',
        'public.credit_points(uuid, integer, text, uuid)',
        'public.debit_points(uuid, integer, text)',
        'public.redeem_reward(uuid, uuid)',
        'public.send_kudos(uuid, uuid, text, integer, text[])',
        'public.register_admin_organization(text, text)'
    ]
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END LOOP;
END $$;

-- ------------------------------------------------------------ 2. search_path
ALTER FUNCTION public.get_points_summary(uuid) SET search_path = public;
ALTER FUNCTION public.get_program_breakdown(uuid) SET search_path = public;
ALTER FUNCTION public.get_top_recipients(uuid, integer) SET search_path = public;

-- ------------------------------------------------------------ 3. indexes
-- Message rate limit counts a sender's messages in the last minute.
CREATE INDEX IF NOT EXISTS idx_community_messages_sender_created ON community_messages(sender_id, created_at DESC);
-- ON DELETE SET NULL / cascade lookups.
CREATE INDEX IF NOT EXISTS idx_community_reports_post ON community_reports(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_reports_comment ON community_reports(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_accepted ON community_posts(accepted_comment_id, id) WHERE accepted_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_comments_org ON community_comments(org_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_catalog_item ON redemptions(catalog_item_id);
