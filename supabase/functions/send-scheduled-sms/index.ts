import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient} from "https://esm.sh/@supabase/supabase-js@2.47.12";

// Twilio credentials and phone number
const TWILIO_ACCOUNT_SID = 'ACd6884be9a81790329f1147e03966e8da';
const TWILIO_AUTH_TOKEN = '12c8834e2d037e300727a51f81792328';
const TWILIO_PHONE_NUMBER = 'DspaRwanda';
const RECIPIENT_PHONE_NUMBER = '+250784688579'; // Hardcoded recipient phone number

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to send SMS using Twilio API
async function sendSMS(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER,
      Body: body,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`Twilio API error: ${error.message}`);
    throw new Error(`Twilio API error: ${error.message}`);
  }
  console.log(`SMS sent to ${to}`);
}

// Main function to check scheduled SMS
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('MY_SUPABASE_URL') ?? '',
      Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current UTC time
    const now = new Date().toISOString();

    // Fetch unsent scheduled SMS that are due for now or earlier
    const { data: scheduledSMS, error } = await supabaseClient
      .from('scheduled_sms')
      .select('*')
      .eq('sent', false)  // Only fetch unsent messages
      .lte('scheduled_time', now);  // Only fetch messages scheduled for now or earlier

    if (error) {
      console.error('Error fetching scheduled SMS:', error);
      throw error;
    }

    if (!scheduledSMS || scheduledSMS.length === 0) {
      console.log('No scheduled SMS to process');
      return new Response(
        JSON.stringify({ message: 'No SMS to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Process each scheduled SMS
    for (const sms of scheduledSMS) {
      console.log(`Processing scheduled SMS ID: ${sms.id}`);

      try {
        // Send SMS if phone number is populated (hardcoded recipient)
        await sendSMS(RECIPIENT_PHONE_NUMBER, sms.message); // Using hardcoded recipient

        // Update the scheduled_sms table to mark the message as sent
        const { error: updateError } = await supabaseClient
          .from('scheduled_sms')
          .update({
            sent: true,  // Mark as sent
            sent_at: new Date().toISOString(),  // Update sent timestamp
          })
          .eq('id', sms.id);  // Update by scheduled SMS ID

        if (updateError) {
          console.error(`Error updating scheduled SMS ID ${sms.id}:`, updateError);
        } else {
          console.log(`Scheduled SMS ID ${sms.id} marked as sent.`);
        }
      } catch (err) {
        console.error(`Error processing scheduled SMS ID ${sms.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: scheduledSMS.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
