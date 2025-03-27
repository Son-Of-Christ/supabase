// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; 
// import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
// import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// const TWILIO_ACCOUNT_SID = 'ACd6884be9a81790329f1147e03966e8da';
// const TWILIO_AUTH_TOKEN = '12c8834e2d037e300727a51f81792328';
// const TWILIO_PHONE_NUMBER = 'DspaRwanda';

// // Twilio SMS function
// async function sendSMS(to: string, body: string): Promise<void> {
//   const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

//   const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

//   const response = await fetch(url, {
//     method: 'POST',
//     headers: {
//       'Authorization': `Basic ${auth}`,
//       'Content-Type': 'application/x-www-form-urlencoded',
//     },
//     body: new URLSearchParams({
//       To: to,
//       From: TWILIO_PHONE_NUMBER,
//       Body: body,
//     }),
//   });

//   if (!response.ok) {
//     const error = await response.json();
//     console.error(`Twilio API error: ${error.message}`);
//     throw new Error(`Twilio API error: ${error.message}`);
//   }
//   console.log(`SMS sent to ${to}`);
// }

// // Email sending function with parameter types
// async function sendEmail(to: string, subject: string, body: string, supabaseClient: SupabaseClient): Promise<void> {
//   const signature = await getEmailSignature(supabaseClient);

//   // Append the signature to the email body
// // Append the signature to the email body
//   // Make sure both body and signature are properly formatted as HTML
//   const fullBody = signature 
//     ? `<div>${body}</div><br/><br/>${signature}`
//     : `<div>${body}</div>`;
//   const client = new SMTPClient({
//     connection: {
//       hostname: 'smtp.gmail.com',
//       port: 465,
//       tls: true,
//       auth: {
//         username: 'dspamanager@gmail.com',
//         password:  'khgoqlhowtrlkmwb', 
//       },
//     },
//   });

//   const emailAddresses = to.split(',').map(email => email.trim());
//   const mainRecipient = emailAddresses[0];
//   const ccRecipients = emailAddresses.slice(1); // All but the first email are CC'd
//   const defaultCC = [
//     'dspa.rw@gmail.com',  // Default CC 1
//     'tjbsaved@dspa.rw',   // Default CC 2
//   ];
//   const finalCC = [...defaultCC, ...ccRecipients];

//   try {
//     await client.send({
//       from: 'DSPA-RWANDA <dspamanager@gmail.com>',
//       to:mainRecipient,
//       cc:finalCC,
//       subject,
//       html: fullBody,
//       headers: {
//         'Content-Type': 'text/html; charset=utf-8',
//       },
      
//     });
//     console.log(`Email sent to ${mainRecipient} (CC: ${finalCC.join(', ')})`);
//   } catch (error) {
//     console.error(`Failed to send email to ${to}:`, error);
//     throw error;
//   } finally {
//     await client.close();
//   }
// }

// // Function to get the email signature
// // Function to get the email signature
// async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
//   try {
//     const { data: signatureData, error } = await supabaseClient
//       .from('signatures')
//       .select('signature_html')
//       .single();

//     if (error) {
//       console.error('Error fetching signature:', error);
//       return null;
//     }

//     // Clean up the signature by removing only the encoded artifacts
//     if (signatureData?.signature_html) {
//       return signatureData.signature_html
//         // Replace encoded soft line breaks (if they exist) and any other encoding artifacts
//         .replace(/=\r?\n/g, '') // Remove soft line breaks
//         .replace(/=[0-9A-F]{2}/g, (match: string) => { // Decode other quoted-printable characters
//           try {
//             // Decode hexadecimal to character and only replace if it's not a space
//             const char = String.fromCharCode(parseInt(match.substring(1), 16));
//             return char !== ' ' ? char : match; // Only replace if not a space
//           } catch {
//             return match; // In case of an error, leave it as is
//           }
//         });
//     }

//     return null;
//   } catch (error) {
//     console.error('Error fetching signature:', error);
//     return null;
//   }
// }


// // Main function to check scheduled notifications
// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseClient = createClient(
//       Deno.env.get('MY_SUPABASE_URL') ?? '',
//       Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     // Fetch notifications that are unsent and scheduled for now or earlier
//     const { data: notifications, error } = await supabaseClient
//       .from('notifications')
//       .select('*')
//       .eq('sent', false)
//       .lte('scheduled_for', new Date().toISOString()); // Only notifications that should be sent

//     if (error) {
//       console.error('Error fetching notifications:', error);
//       throw error;
//     }

//     if (!notifications || notifications.length === 0) {
//       console.log('No notifications to process');
//       return new Response(
//         JSON.stringify({ message: 'No notifications to send' }),
//         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
//       );
//     }

//     for (const notification of notifications) {
//       console.log(`Processing notification ID: ${notification.id}`);

//       try {
//         // Send email or emails if email field is populated
       
//         if (notification.email) {
//           // Handle the email sending logic with the new CC logic
//           await sendEmail(
//             notification.email, // Main recipient (comma-separated emails)
//             notification.subject,
//             notification.description,
//             supabaseClient
//           );
//         }
        

//         // Send SMS if phone field is populated
//         if (notification.phone) {
//           const phoneNumbers = notification.phone.split(',').map((phone: string) => phone.trim());
//           for (const phoneNumber of phoneNumbers) {
//             await sendSMS(phoneNumber, notification.description);
//           }
//         }
        
        
//         // Update the notification in the database to mark it as sent
//         const { error: updateError } = await supabaseClient
//           .from('notifications')
//           .update({
//             sent: true, // Set sent to true
//             sent_at: new Date().toISOString(), // Update sent_at timestamp
//           })
//           .eq('id', notification.id); // Use the correct ID for update

//         if (updateError) {
//           console.error(`Error updating notification ID ${notification.id}:`, updateError);
//         } else {
//           console.log(`Notification ID ${notification.id} marked as sent.`);
//         }
//       } catch (err) {
//         console.error(`Error processing notification ID ${notification.id}:`, err);
//       }
//     }

//     return new Response(
//       JSON.stringify({ success: true, processed: notifications.length }),
//       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
//     );
//   } catch (error) {
//     console.error('Error:', error);
//     return new Response(
//       JSON.stringify({ error: (error as Error).message }),
//       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
//     );
//   }
// });

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; 
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWILIO_ACCOUNT_SID = 'ACd6884be9a81790329f1147e03966e8da';
const TWILIO_AUTH_TOKEN = '12c8834e2d037e300727a51f81792328';
const TWILIO_PHONE_NUMBER = 'DspaRwanda';

// Twilio SMS function
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

// Email sending function with parameter types
async function sendEmail(to: string, subject: string, body: string, supabaseClient: SupabaseClient, attachmentPath?: string): Promise<void> {
  const signature = await getEmailSignature(supabaseClient);

  const fullBody = signature 
    ? `<div>${body}</div><br/><br/>${signature}`
    : `<div>${body}</div>`;

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: {
        username: 'dspamanager@gmail.com',
        password: 'khgoqlhowtrlkmwb', 
      },
    },
  });

  const emailAddresses = to.split(',').map(email => email.trim());
  const mainRecipient = emailAddresses[0];
  const ccRecipients = emailAddresses.slice(1);
  const defaultCC = [
    'dspa.rw@gmail.com',
    'tjbsaved@dspa.rw',
  ];
  const finalCC = [...defaultCC, ...ccRecipients];

  const emailConfig: any = {
    from: 'DSPA-RWANDA <dspamanager@gmail.com>',
    to: mainRecipient,
    cc: finalCC,
    subject,
    html: fullBody,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  };

  // Handle attachment if provided
 // In the sendEmail function, update the attachment handling section:
if (attachmentPath) {
  try {
    // Get the file directly from storage using the stored filename
    const { data: fileData, error: fileError } = await supabaseClient
      .storage
      .from('email-files')  // Make sure this matches your bucket name
      .download(attachmentPath);

    if (fileError) throw fileError;

    // Extract original filename (remove timestamp prefix)
    const fileNameParts = attachmentPath.split('_');
    const originalFileName = fileNameParts.slice(1).join('_');

    // Get proper MIME type
    const fileExtension = originalFileName.split('.').pop()?.toLowerCase() || '';
    const contentType = getMimeType(fileExtension);

    emailConfig.attachments = [{
      filename: originalFileName,  // Use clean filename
      content: fileData,
      contentType: contentType,
    }];
    
    console.log(`Attaching file: ${originalFileName} (${contentType})`);
  } catch (error) {
    console.error('Error handling attachment:', error);
    throw error;
  }
}

// Add MIME type helper function at the bottom
function getMimeType(extension: string): string {
  switch (extension) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

  try {
    await client.send(emailConfig);
    console.log(`Email sent to ${mainRecipient} (CC: ${finalCC.join(', ')})`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  } finally {
    await client.close();
  }
}

// Function to get the email signature
// Replace the existing getEmailSignature function with this version
async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
  try {
    const { data: signatureData, error } = await supabaseClient
      .from('signatures')
      .select('signature_html')
      .single();

    if (error || !signatureData?.signature_html) {
      console.error('Error fetching signature:', error);
      return null;
    }

    // Return the raw HTML without any processing
    return signatureData.signature_html;

  } catch (error) {
    console.error('Error fetching signature:', error);
    return null;
  }
}

// Main function to check scheduled notifications
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('MY_SUPABASE_URL') ?? '',
      Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: notifications, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('sent', false)
      .lte('scheduled_for', new Date().toISOString());

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    if (!notifications || notifications.length === 0) {
      console.log('No notifications to process');
      return new Response(
        JSON.stringify({ message: 'No notifications to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    for (const notification of notifications) {
      console.log(`Processing notification ID: ${notification.id}`);

      try {
        if (notification.email) {
          await sendEmail(
            notification.email,
            notification.subject,
            notification.description,
            supabaseClient,
            notification.attachment_path
          );
        }

        if (notification.phone) {
          const phoneNumbers = notification.phone.split(',').map((phone: string) => phone.trim());
          for (const phoneNumber of phoneNumbers) {
            await sendSMS(phoneNumber, notification.description);
          }
        }
        
        const { error: updateError } = await supabaseClient
          .from('notifications')
          .update({
            sent: true,
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`Error updating notification ID ${notification.id}:`, updateError);
        } else {
          console.log(`Notification ID ${notification.id} marked as sent.`);
        }
      } catch (err) {
        console.error(`Error processing notification ID ${notification.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: notifications.length }),
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