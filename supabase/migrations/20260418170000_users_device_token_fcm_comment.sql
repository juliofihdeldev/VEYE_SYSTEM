-- Migration from OneSignal player IDs to Firebase Cloud Messaging (FCM) tokens.
-- The column name `device_token` stays — it is the recipient identifier for
-- whichever push provider is active. Existing OneSignal player IDs are
-- harmless (FCM v1 will reject them with 404 UNREGISTERED and the
-- `send-notification` Edge Function clears stale rows automatically).
begin;

comment on column public.users.device_token is 'FCM registration token for push notifications (was OneSignal player id pre-2026-04)';

commit;
