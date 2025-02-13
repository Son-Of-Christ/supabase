import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; 
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12"; 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to clean up the signature by removing encoding artifacts
function cleanUpSignature(signature: string): string {
  return signature
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=[0-9A-F]{2}/g, (match: string) => { // Decode quoted-printable characters
      try {
        // Decode hexadecimal to character and only replace if it's not a space
        const char = String.fromCharCode(parseInt(match.substring(1), 16));
        return char !== ' ' ? char : match; // Only replace if not a space
      } catch {
        return match; // In case of an error, leave it as is
      }
    });
}

// Function to get the email signature from Supabase
async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from('signatures') // Assuming you have a 'signatures' table
      .select('signature_html')
      .single();

    if (error) throw error;
    return data ? cleanUpSignature(data.signature_html) : null;
  } catch (error) {
    console.error('Error fetching signature:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('MY_SUPABASE_URL') ?? '',
      Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();

    // Fetch contracts with client emails and the sent status
    const { data: contracts, error: contractsError } = await supabaseClient
      .from('contracts')
      .select(
        `id, offeror_name, type, description, start_date, end_date,
        contract_client_emails (emails, sent)`
      );

    if (contractsError) throw contractsError;

    // Fetch the email signature from the database
    const emailSignature = await getEmailSignature(supabaseClient);

    for (const contract of contracts) {
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);

      // Calculate contract duration
      const contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine reminder period
      const reminderDaysBefore = contractDuration > 30 ? 30 : 5;

      // Calculate the reminder date
      const reminderDate = new Date(endDate);
      reminderDate.setDate(endDate.getDate() - reminderDaysBefore);

      // Check if today is the reminder date and if the email has not been sent
      if (today.toISOString().split('T')[0] === reminderDate.toISOString().split('T')[0]) {
        if (contract.contract_client_emails && contract.contract_client_emails.length > 0) {
          // Check if the email has already been sent
          const emailClient = contract.contract_client_emails[0];
          if (emailClient.sent) {
            continue; // Skip if the email has already been sent
          }

          // Extract emails
          const emailList = emailClient.emails.split(',').map((email: string) => email.trim());

          // Ensure at least one email exists
          if (emailList.length === 0) continue;

          const primaryEmail = emailList[0]; // First email is the main recipient
          const ccEmails = emailList.slice(1); // Remaining emails go to CC
          const defaultCC = [
            'dspa.rw@gmail.com',  // Default CC 1
            'tjbsaved@dspa.rw',
            // Default CC 2
          ];
          const finalCC = [...defaultCC, ...ccEmails];
          // Prepare HTML email body with signature
          const emailBody = `
<html>
  <body>
    <p>Dear Client,</p>

    <p>This is a reminder that your contract with <strong>DSPA(R) LTD</strong> is approaching its end date.</p>
>
    <table border="1" cellpadding="5">
      <tr>
        <th>Contract Details:</th>
      </tr>
      <tr>
        <td><strong>Offeror:</strong> ${contract.offeror_name}</td>
      </tr>
      <tr>
        <td><strong>Type:</strong> ${contract.type}</td>
      </tr>
      <tr>
        <td><strong>Description:</strong> ${contract.description}</td>
      </tr>
      <tr>
        <td><strong>Start Date:</strong> ${contract.start_date}</td>
      </tr>
      <tr>
        <td><strong>End Date:</strong> ${contract.end_date}</td>
      </tr>
    </table>

    <p>Please take necessary action regarding the contract renewal or closure.</p>

    <p>Best regards,</p>
    <p>DSPA-RWANDA</p>
    ${emailSignature ? `<br><br>${emailSignature}` : ''}
  </body>
</html>
`;
// Fetch contract files (optional, as files might not be uploaded)
const { data: contractFiles, error: filesError } = await supabaseClient
  .from('contract_files')
  .select('id, file_name, file_path,mime_type,file_size')
  .eq('contract_id', contract.id); // Fetch the files for the contract

if (filesError) throw filesError;
type Attachment = {
    fileName: string;
    filePath: string;
    mimeType?: string;  // Optional
    fileSize?: number;  // Optional
  };
// If contract files exist, attach them; otherwise, proceed without attachments
let attachments: Attachment[] | undefined = [];
if (contractFiles && contractFiles.length > 0) {
  attachments = contractFiles.map(file => ({
    fileName: file.file_name as string,  // Make sure file_name is treated as a string
    filePath: file.file_path as string,  // Make sure file_path is treated as a string
    mimeType: file.mime_type ? file.mime_type : undefined,  // Optional
    fileSize: file.file_size ? file.file_size : undefined,  // Optional
  }));
}

          // Send email
          const { error: emailError } = await supabaseClient
            .from('emails')
            .insert({
              from: 'DSPA-RWANDA <dspamanager@gmail.com>',
              subject: `Contract Expiration Reminder: ${contract.offeror_name}`,
              body: emailBody,
              to: primaryEmail,
              cc: finalCC.length > 0 ? ccEmails.join(',') : null, // CC other emails
              // Ensure email type is HTML
              headers: { 'Content-Type': 'text/html; charset=UTF-8' },
              attachments: attachments.length > 0 ? attachments : undefined,
            });

          if (emailError) throw emailError;

          // Update the sent status to true after sending the email
          const { error: updateError } = await supabaseClient
            .from('contract_client_emails')
            .update({ sent: true })
            .match({ emails: emailClient.emails });

          if (updateError) throw updateError;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: 'Reminder emails sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
  }
});
