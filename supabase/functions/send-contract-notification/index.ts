// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; 
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12"; 
// import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// // Email sending function
// async function sendEmail(to: string, subject: string, body: string): Promise<void> {
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

//   try {
//     await client.send({
//       from: `DSPA-MANAGER SYSTEM <dspamanager@gmail.com>`,
//       to,
//       subject,
//       html: body,
//     });
//     console.log(`Email sent to ${to}`);
//   } catch (error) {
//     console.error(`Failed to send email to ${to}:`, error);
//     throw error;
//   } finally {
//     await client.close();
//   }
// }

// // Main function to process contracts and send reminders
// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseClient = createClient(
//       Deno.env.get('MY_SUPABASE_URL') ?? '',
//       Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     // Get contracts that are about to end within the next 30 days and haven't received the reminder yet
//     const { data: contracts, error } = await supabaseClient
//       .from('contracts')
//       .select('*')
//       .eq('reminder_sent', false) // Only fetch contracts where reminder_sent is false
//       .gte('end_date', new Date().toISOString())
//       .lte('end_date', new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString());

//     if (error) {
//       throw error;
//     }

//     // Loop through contracts and send reminder emails
//     for (const contract of contracts) {
//       const offerorName = contract.offeror_name;
//       const type=contract.type;
//       const description = contract.description;
//       const startDate = contract.start_date;
//       const endDate = contract.end_date;

//       // Construct the email body
//       const emailBody = `
//         <p>Hello,</p>
//         <p>This is a reminder that the contract with <strong>${offerorName}</strong> is about to end soon.</p>
//         <p><strong>Type of Contract:</strong> ${type}</p>
//         <p><strong>Description:</strong> ${description}</p>
//         <p><strong>Start Date:</strong> ${startDate}</p>
//         <p><strong>End Date:</strong> ${endDate}</p>
//         <p>Please take necessary action.</p>
//         <p>Regards,.</p>
//         <p>DSPA Manager System</p>
//       `;

//       // Send the email to the three recipients
//       await sendEmail(
//         'dspa.rw@gmail.com', // Replace with actual email
//         'Reminder of End of Contract',
//         emailBody
//       );
//       await sendEmail(
//         'tjbsaved@dspa.rw', // Replace with actual email
//         'Reminder of End of Contract',
//         emailBody
//       );
//       await sendEmail(
//         'hyacenthenikuze@gmail.com', // Replace with actual email
//         'Reminder of End of Contract',
//         emailBody
//       );
//       await sendEmail(
//         'sjeandamascene9@gmail.com', // Replace with actual email
//         'Reminder of End of Contract',
//         emailBody
//       );

//       // After sending the email, update the contract to mark the reminder as sent
//       const { error: updateError } = await supabaseClient
//         .from('contracts')
//         .update({ reminder_sent: true }) // Set reminder_sent to true
//         .eq('id', contract.id); // Match by contract ID

//       if (updateError) {
//         console.error(`Error updating contract ID ${contract.id}:`, updateError);
//       } else {
//         console.log(`Contract ID ${contract.id} marked as reminder sent.`);
//       }
//     }

//     return new Response(
//       JSON.stringify({ success: true, processed: contracts.length }),
//       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
//     );
//   } catch (error) {
//     console.error('Error:', error);
//     return new Response(
//       JSON.stringify({ error: (error as Error).message }),
//       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
//     );
//   }
// });
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; 
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12"; 
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email sending function
async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: {
        username: 'dspamanager@gmail.com',
        password:  'khgoqlhowtrlkmwb', 
      },
    },
  });

  try {
    await client.send({
      from: `DSPA-SYSTEM <dspamanager@gmail.com>`,
      to,
      subject,
      html: body,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  } finally {
    await client.close();
  }
}

// Main function to process contracts and send reminders
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('MY_SUPABASE_URL') ?? '',
      Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get contracts that are about to end within the next 30 days and haven't received the reminder yet
    const { data: contracts, error } = await supabaseClient
      .from('contracts')
      .select('*')
      .eq('reminder_sent', false) // Only fetch contracts where reminder_sent is false
      .gte('end_date', new Date().toISOString())
      .lte('end_date', new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      throw error;
    }

    // Loop through contracts and send reminder emails
    for (const contract of contracts) {
      const offerorName = contract.offeror_name;
      const type=contract.type;
      const description = contract.description;
      const startDate = contract.start_date;
      const endDate = contract.end_date;

      // Check if the contract is shorter than 30 days and remind 5 days before
      if (new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime() < 30 * 24 * 60 * 60 * 1000) {
        const reminderDate = new Date(new Date(contract.end_date).getTime() - 5 * 24 * 60 * 60 * 1000);
        if (new Date() >= reminderDate) {
          // Construct the email body
          const emailBody = `
            <p>Hello,</p>
            <p>This is a reminder that the contract with <strong>${offerorName}</strong> is about to end soon.</p>
            <p><strong>Type of Contract:</strong> ${type}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Start Date:</strong> ${startDate}</p>
            <p><strong>End Date:</strong> ${endDate}</p>
            <p>Please take necessary action.</p>
            <p>Regards,.</p>
            <p>DSPA System</p>
          `;
          
          // Send the email to the four recipients
          await sendEmail('dspa.rw@gmail.com', 'Reminder of End of Contract', emailBody);
          await sendEmail('tjbsaved@dspa.rw', 'Reminder of End of Contract', emailBody);
          await sendEmail('hyacenthenikuze@gmail.com', 'Reminder of End of Contract', emailBody);
          await sendEmail('sjeandamascene9@gmail.com', 'Reminder of End of Contract', emailBody);

          // After sending the email, update the contract to mark the reminder as sent
          const { error: updateError } = await supabaseClient
            .from('contracts')
            .update({ reminder_sent: true }) // Set reminder_sent to true
            .eq('id', contract.id); // Match by contract ID

          if (updateError) {
            console.error(`Error updating contract ID ${contract.id}:`, updateError);
          } else {
            console.log(`Contract ID ${contract.id} marked as reminder sent.`);
          }
        }
      } else {
        // For contracts 30 days or longer, send reminder 30 days before the end date
        const reminderDate = new Date(new Date(contract.end_date).getTime() - 30 * 24 * 60 * 60 * 1000);
        if (new Date() >= reminderDate) {
          const emailBody = `
            <p>Hello,</p>
            <p>This is a reminder that the contract with <strong>${offerorName}</strong> is about to end soon.</p>
            <p><strong>Type of Contract:</strong> ${type}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Start Date:</strong> ${startDate}</p>
            <p><strong>End Date:</strong> ${endDate}</p>
            <p>Please take necessary action. </p>
            <p>Regards,.</p>
            <p>DSPA Manager System</p>
          `;
          
          // Send the email to the four recipients
          await sendEmail('dspa.rw@gmail.com', 'Reminder of End of Contract', emailBody);
          await sendEmail('tjbsaved@dspa.rw', 'Reminder of End of Contract', emailBody);
          await sendEmail('hyacenthenikuze@gmail.com', 'Reminder of End of Contract', emailBody);
          await sendEmail('sjeandamascene9@gmail.com', 'Reminder of End of Contract', emailBody);

          // After sending the email, update the contract to mark the reminder as sent
          const { error: updateError } = await supabaseClient
            .from('contracts')
            .update({ reminder_sent: true }) // Set reminder_sent to true
            .eq('id', contract.id); // Match by contract ID

          if (updateError) {
            console.error(`Error updating contract ID ${contract.id}:`, updateError);
          } else {
            console.log(`Contract ID ${contract.id} marked as reminder sent.`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: contracts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
