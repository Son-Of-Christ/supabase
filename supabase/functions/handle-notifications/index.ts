import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('MY_SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  try {
    const { record } = await req.json()
    
    // Get FCM tokens for the user
    const { data: tokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', record.user_id)
    
    if (!tokens?.length) {
      return new Response(
        JSON.stringify({ message: 'No devices to notify' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send FCM notification to all user devices
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`
      },
      body: JSON.stringify({
        registration_ids: tokens.map(t => t.token),
        notification: {
          title: 'New Email',
          body: 'You have received a new email',
        },
        data: {
          type: 'email',
          id: record.id,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
      })
    })

    const fcmResult = await fcmResponse.json()

    return new Response(
      JSON.stringify({ success: true, fcm: fcmResult }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})