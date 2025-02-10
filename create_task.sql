-- Creates a new task to call your Edge Function every minute
SELECT cron.schedule(
  'send_notifications_task', -- Task name
  '* * * * *', -- Cron schedule (every minute)
  $$ 
  SELECT http_post(
    'https://gubkroeupedoqlnjnxze.supabase.co/functions/v1/check-scheduled-notifications', 
    '{"message": "Hello, this is a test"}'
  ); 
  $$ 
);
