// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; 
// import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12"; 

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// // Function to clean up the signature by removing encoding artifacts
// function cleanUpSignature(signature: string): string {
//   return signature
//     .replace(/=\r?\n/g, '') // Remove soft line breaks
//     .replace(/=[0-9A-F]{2}/g, (match: string) => { // Decode quoted-printable characters
//       try {
//         // Decode hexadecimal to character and only replace if it's not a space
//         const char = String.fromCharCode(parseInt(match.substring(1), 16));
//         return char !== ' ' ? char : match; // Only replace if not a space
//       } catch {
//         return match; // In case of an error, leave it as is
//       }
//     });
// }

// // Function to get the email signature from Supabase
// async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
//   try {
//     const { data, error } = await supabaseClient
//       .from('signatures') // Assuming you have a 'signatures' table
//       .select('signature_html')
//       .single();

//     if (error) throw error;
//     return data ? cleanUpSignature(data.signature_html) : null;
//   } catch (error) {
//     console.error('Error fetching signature:', error);
//     return null;
//   }
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseClient = createClient(
//       Deno.env.get('MY_SUPABASE_URL') ?? '',
//       Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     const today = new Date();

//     // Fetch contracts with client emails and the sent status
//     const { data: contracts, error: contractsError } = await supabaseClient
//       .from('contracts')
//       .select(
//         `id, offeror_name, type, description, start_date, end_date,
//         contract_client_emails (emails, sent)`
//       );

//     if (contractsError) throw contractsError;

//     // Fetch the email signature from the database
//     const emailSignature = await getEmailSignature(supabaseClient);

//     for (const contract of contracts) {
//       const startDate = new Date(contract.start_date);
//       const endDate = new Date(contract.end_date);

//       // Calculate contract duration
//       const contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

//       // Determine reminder period
//       const reminderDaysBefore = contractDuration > 30 ? 30 : 5;

//       // Calculate the reminder date
//       const reminderDate = new Date(endDate);
//       reminderDate.setDate(endDate.getDate() - reminderDaysBefore);

//       // Check if today is the reminder date and if the email has not been sent
//       if (today.toISOString().split('T')[0] === reminderDate.toISOString().split('T')[0]) {
//         if (contract.contract_client_emails && contract.contract_client_emails.length > 0) {
//           // Check if the email has already been sent
//           const emailClient = contract.contract_client_emails[0];
//           if (emailClient.sent) {
//             continue; // Skip if the email has already been sent
//           }

//           // Extract emails
//           const emailList = emailClient.emails.split(',').map((email: string) => email.trim());

//           // Ensure at least one email exists
//           if (emailList.length === 0) continue;

//           const primaryEmail = emailList[0]; // First email is the main recipient
//           const ccEmails = emailList.slice(1); // Remaining emails go to CC
//           const defaultCC = [
//             'dspa.rw@gmail.com',  // Default CC 1
//             'tjbsaved@dspa.rw',
//             // Default CC 2
//           ];
//           const finalCC = [...defaultCC, ...ccEmails];
//           // Prepare HTML email body with signature
//           const emailBody = `
// <html>
//   <body>
//     <p>Dear Client,</p>

//     <p>This is a reminder that your contract with <strong>DSPA(R) LTD</strong> is approaching its end date.</p>
// >
//     <table border="1" cellpadding="5">
//       <tr>
//         <th>Contract Details:</th>
//       </tr>
//       <tr>
//         <td><strong>Offeror:</strong> ${contract.offeror_name}</td>
//       </tr>
//       <tr>
//         <td><strong>Type:</strong> ${contract.type}</td>
//       </tr>
//       <tr>
//         <td><strong>Description:</strong> ${contract.description}</td>
//       </tr>
//       <tr>
//         <td><strong>Start Date:</strong> ${contract.start_date}</td>
//       </tr>
//       <tr>
//         <td><strong>End Date:</strong> ${contract.end_date}</td>
//       </tr>
//     </table>

//     <p>Please take necessary action.</p>

//     <p>Best regards,</p>
//     <p>DSPA-RWANDA</p>
//     ${emailSignature ? `<br><br>${emailSignature}` : ''}
//   </body>
// </html>
// `;
// // Fetch contract files (optional, as files might not be uploaded)
// const { data: contractFiles, error: filesError } = await supabaseClient
//   .from('contract_files')
//   .select('id, file_name, file_path,mime_type,file_size')
//   .eq('contract_id', contract.id); // Fetch the files for the contract

// if (filesError) throw filesError;
// type Attachment = {
//     fileName: string;
//     filePath: string;
//     mimeType?: string;  // Optional
//     fileSize?: number;  // Optional
//   };
// // If contract files exist, attach them; otherwise, proceed without attachments
// let attachments: Attachment[] | undefined = [];
// if (contractFiles && contractFiles.length > 0) {
//   attachments = contractFiles.map(file => ({
//     fileName: file.file_name as string,  // Make sure file_name is treated as a string
//     filePath: file.file_path as string,  // Make sure file_path is treated as a string
//     mimeType: file.mime_type ? file.mime_type : undefined,  // Optional
//     fileSize: file.file_size ? file.file_size : undefined,  // Optional
//   }));
// }

//           // Send email
//           const { error: emailError } = await supabaseClient
//             .from('emails')
//             .insert({
//               from: 'DSPA-RWANDA <dspamanager@gmail.com>',
//               subject: `Contract Expiration Reminder: ${contract.offeror_name}`,
//               body: emailBody,
//               to: primaryEmail,
//               cc: finalCC.length > 0 ? ccEmails.join(',') : null, // CC other emails
//               // Ensure email type is HTML
//               headers: { 'Content-Type': 'text/html; charset=UTF-8' },
//               attachments: attachments.length > 0 ? attachments : undefined,
//             });

//           if (emailError) throw emailError;

//           // Update the sent status to true after sending the email
//           const { error: updateError } = await supabaseClient
//             .from('contract_client_emails')
//             .update({ sent: true })
//             .match({ emails: emailClient.emails });

//           if (updateError) throw updateError;
//         }
//       }
//     }

//     return new Response(
//       JSON.stringify({ message: 'Reminder emails sent successfully' }),
//       {
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//         status: 200,
//       }
//     );
//   } catch (error) {
//     return new Response(
//         JSON.stringify({ error: (error as Error).message }),
//         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
//       );
//   }
// });
// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// // Function to clean up the signature by removing encoding artifacts
// function cleanUpSignature(signature: string): string {
//   return signature
//     .replace(/=\r?\n/g, '') // Remove soft line breaks
//     .replace(/=[0-9A-F]{2}/g, (match: string) => { // Decode quoted-printable characters
//       try {
//         // Decode hexadecimal to character and only replace if it's not a space
//         const char = String.fromCharCode(parseInt(match.substring(1), 16));
//         return char !== ' ' ? char : match; // Only replace if not a space
//       } catch {
//         return match; // In case of an error, leave it as is
//       }
//     });
// }

// // Function to get the email signature from Supabase
// async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
//   try {
//     const { data, error } = await supabaseClient
//       .from('signatures') // Assuming you have a 'signatures' table
//       .select('signature_html')
//       .single();

//     if (error) throw error;
//     return data ? cleanUpSignature(data.signature_html) : null;
//   } catch (error) {
//     console.error('Error fetching signature:', error);
//     return null;
//   }
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseClient = createClient(
//       Deno.env.get('MY_SUPABASE_URL') ?? '',
//       Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     const today = new Date();

//     // Fetch contracts with client emails and the sent status
//     const { data: contracts, error: contractsError } = await supabaseClient
//       .from('contracts')
//       .select(
//         `id, offeror_name, type, description, start_date, end_date,
//         contract_client_emails (emails, sent)`
//       );

//     if (contractsError) throw contractsError;

//     // Fetch the email signature from the database
//     const emailSignature = await getEmailSignature(supabaseClient);

//     for (const contract of contracts) {
//       const startDate = new Date(contract.start_date);
//       const endDate = new Date(contract.end_date);

//       // Calculate contract duration
//       const contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

//       // Determine reminder period
//       const reminderDaysBefore = contractDuration > 30 ? 30 : 5;

//       // Calculate the reminder date
//       const reminderDate = new Date(endDate);
//       reminderDate.setDate(endDate.getDate() - reminderDaysBefore);

//       // Check if today is the reminder date and if the email has not been sent
//       if (today.toISOString().split('T')[0] === reminderDate.toISOString().split('T')[0]) {
//         if (contract.contract_client_emails && contract.contract_client_emails.length > 0) {
//           // Check if the email has already been sent
//           const emailClient = contract.contract_client_emails[0];
//           if (emailClient.sent) {
//             console.log(`Email already sent for contract ${contract.id}`);
//             continue; // Skip if the email has already been sent
//           }

//           // Extract emails
//           const emailList = emailClient.emails.split(',').map((email: string) => email.trim());

//           // Ensure at least one email exists
//           if (emailList.length === 0) {
//             console.log(`No emails found for contract ${contract.id}`);
//             continue;
//           }

//           const primaryEmail = emailList[0]; // First email is the main recipient
//           const ccEmails = emailList.slice(1); // Remaining emails go to CC
//           const defaultCC = [
//             'dspa.rw@gmail.com',  // Default CC 1
//             'tjbsaved@dspa.rw',
//             // Default CC 2
//           ];
//           const finalCC = [...defaultCC, ...ccEmails];
//           // Prepare HTML email body with signature
//           const emailBody = `
// <html>
//   <body>
//     <p>Dear Client,</p>

//     <p>This is a reminder that your contract with <strong>DSPA(R) LTD</strong> is approaching its end date.</p>
// >
//     <table border="1" cellpadding="5">
//       <tr>
//         <th>Contract Details:</th>
//       </tr>
//       <tr>
//         <td><strong>Offeror:</strong> ${contract.offeror_name}</td>
//       </tr>
//       <tr>
//         <td><strong>Type:</strong> ${contract.type}</td>
//       </tr>
//       <tr>
//         <td><strong>Description:</strong> ${contract.description}</td>
//       </tr>
//       <tr>
//         <td><strong>Start Date:</strong> ${contract.start_date}</td>
//       </tr>
//       <tr>
//         <td><strong>End Date:</strong> ${contract.end_date}</td>
//       </tr>
//     </table>

//     <p>Please take necessary action.</p>

//     <p>Best regards,</p>
//     <p>DSPA-RWANDA</p>
//     ${emailSignature ? `<br><br>${emailSignature}` : ''}
//   </body>
// </html>
// `;
// // Fetch contract files (optional, as files might not be uploaded)
// const { data: contractFiles, error: filesError } = await supabaseClient
//   .from('contract_files')
//   .select('id, file_name, file_path,mime_type,file_size')
//   .eq('contract_id', contract.id); // Fetch the files for the contract

// if (filesError) throw filesError;
// type Attachment = {
//     fileName: string;
//     filePath: string;
//     mimeType?: string;  // Optional
//     fileSize?: number;  // Optional
//   };
// // If contract files exist, attach them; otherwise, proceed without attachments
// let attachments: Attachment[] | undefined = [];
// if (contractFiles && contractFiles.length > 0) {
//   attachments = contractFiles.map(file => ({
//     fileName: file.file_name as string,  // Make sure file_name is treated as a string
//     filePath: file.file_path as string,  // Make sure file_path is treated as a string
//     mimeType: file.mime_type ? file.mime_type : undefined,  // Optional
//     fileSize: file.file_size ? file.file_size : undefined,  // Optional
//   }));
// }

//           // Send email
//           const { error: emailError } = await supabaseClient
//             .from('emails')
//             .insert({
//               from: 'DSPA-RWANDA <dspamanager@gmail.com>',
//               subject: `Contract Expiration Reminder: ${contract.offeror_name}`,
//               body: emailBody,
//               to: primaryEmail,
//               cc: finalCC.length > 0 ? ccEmails.join(',') : null, // CC other emails
//               // Ensure email type is HTML
//               headers: { 'Content-Type': 'text/html; charset=UTF-8' },
//               attachments: attachments.length > 0 ? attachments : undefined,
//             });

//           if (emailError) {
//             console.error(`Error sending email for contract ${contract.id}:`, emailError);
//             throw emailError;
//           }

//           // Update the sent status to true after sending the email
//           const { error: updateError } = await supabaseClient
//             .from('contract_client_emails')
//             .update({ sent: true })
//             .match({ emails: emailClient.emails });

//           if (updateError) {
//             console.error(`Error updating sent status for contract ${contract.id}:`, updateError);
//             throw updateError;
//           }

//           console.log(`Email sent successfully for contract ${contract.id}`);
//         }
//       }
//     }

//     return new Response(
//       JSON.stringify({ message: 'Reminder emails sent successfully' }),
//       {
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//         status: 200,
//       }
//     );
//   } catch (error) {
//     console.error('Error in serve function:', error);
//     return new Response(
//         JSON.stringify({ error: (error as Error).message }),
//         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
//       );
//   }
// });

// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// // Function to clean up the signature by removing encoding artifacts
// function cleanUpSignature(signature: string): string {
//   return signature
//     .replace(/=\r?\n/g, '') // Remove soft line breaks
//     .replace(/=[0-9A-F]{2}/g, (match: string) => { // Decode quoted-printable characters
//       try {
//         const char = String.fromCharCode(parseInt(match.substring(1), 16))
//         return char !== ' ' ? char : match; // Only replace if not a space
//       } catch {
//         return match; // In case of an error, leave it as is
//       }
//     });
// }

// // Function to get the email signature from Supabase
// async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
//   try {
//     const { data, error } = await supabaseClient
//       .from('signatures')
//       .select('signature_html')
//       .single();

//     if (error) throw error;
//     return data ? cleanUpSignature(data.signature_html) : null;
//   } catch (error) {
//     console.error('Error fetching signature:', error);
//     return null;
//   }
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseClient = createClient(
//       Deno.env.get('MY_SUPABASE_URL') ?? '',
//       Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     const today = new Date();
//     console.log(`Today's date: ${today.toISOString()}`);

//     // Fetch contracts with client emails and the sent status
//     const { data: contracts, error: contractsError } = await supabaseClient
//       .from('contracts')
//       .select(`
//         id, offeror_name, type, description, start_date, end_date,
//         contract_client_emails (emails, sent)
//       `);

//     if (contractsError) {
//       console.error('Error fetching contracts:', contractsError);
//       throw contractsError;
//     }

//     console.log(`Fetched ${contracts.length} contracts`);

//     // Fetch the email signature from the database
//     const emailSignature = await getEmailSignature(supabaseClient);
//     console.log('Email signature fetched:', emailSignature ? 'Yes' : 'No');

//     for (const contract of contracts) {
//       const startDate = new Date(contract.start_date);
//       const endDate = new Date(contract.end_date);

//       // Calculate contract duration in days
//       const contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
//       console.log(`Contract ${contract.id} duration: ${contractDuration} days`);

//       // Determine reminder period
//       const reminderDaysBefore = contractDuration > 30 ? 30 : 5;
//       console.log(`Reminder days before end date: ${reminderDaysBefore}`);

//       // Calculate the reminder date
//       const reminderDate = new Date(endDate);
//       reminderDate.setDate(endDate.getDate() - reminderDaysBefore);
//       console.log(`Reminder date for contract ${contract.id}: ${reminderDate.toISOString()}`);

//       // Check if today is the reminder date and if the email has not been sent
//       if (today.toISOString().split('T')[0] === reminderDate.toISOString().split('T')[0]) {
//         console.log(`Today is the reminder date for contract ${contract.id}`);

//         if (contract.contract_client_emails && contract.contract_client_emails.length > 0) {
//           const emailClient = contract.contract_client_emails[0];

//           // Check if the email has already been sent
//           if (emailClient.sent) {
//             console.log(`Email already sent for contract ${contract.id}`);
//             continue; // Skip if the email has already been sent
//           }

//           // Extract emails
//           const emailList = emailClient.emails.split(',').map((email: string) => email.trim());
//           console.log(`Emails to send for contract ${contract.id}:`, emailList);

//           // Ensure at least one email exists
//           if (emailList.length === 0) {
//             console.log(`No emails found for contract ${contract.id}`);
//             continue;
//           }

//           const primaryEmail = emailList[0]; // First email is the main recipient
//           const ccEmails = emailList.slice(1); // Remaining emails go to CC
//           const defaultCC = [
//             'dspa.rw@gmail.com',  // Default CC 1
//             'tjbsaved@dspa.rw',   // Default CC 2
//           ];
//           const finalCC = [...defaultCC, ...ccEmails];
//           console.log(`Primary email: ${primaryEmail}, CC emails: ${finalCC.join(', ')}`);

//           // Prepare HTML email body with signature
//           const emailBody = `
// <html>
//   <body>
//     <p>Dear Client,</p>
//     <p>This is a reminder that your contract with <strong>DSPA(R) LTD</strong> is approaching its end date.</p>
//     <table border="1" cellpadding="5">
//       <tr>
//         <th>Contract Details:</th>
//       </tr>
//       <tr>
//         <td><strong>Offeror:</strong> ${contract.offeror_name}</td>
//       </tr>
//       <tr>
//         <td><strong>Type:</strong> ${contract.type}</td>
//       </tr>
//       <tr>
//         <td><strong>Description:</strong> ${contract.description}</td>
//       </tr>
//       <tr>
//         <td><strong>Start Date:</strong> ${contract.start_date}</td>
//       </tr>
//       <tr>
//         <td><strong>End Date:</strong> ${contract.end_date}</td>
//       </tr>
//     </table>
//     <p>Please take necessary action.</p>
//     <p>Best regards,</p>
//     <p>DSPA-RWANDA</p>
//     ${emailSignature ? `<br><br>${emailSignature}` : ''}
//   </body>
// </html>
// `;

//           // Fetch contract files (optional, as files might not be uploaded)
//           const { data: contractFiles, error: filesError } = await supabaseClient
//             .from('contract_files')
//             .select('id, file_name, file_path, mime_type, file_size')
//             .eq('contract_id', contract.id);

//           if (filesError) throw filesError;

//           // Prepare attachments
//           let attachments: string | any[] | undefined = [];
//           if (contractFiles && contractFiles.length > 0) {
//             attachments = contractFiles.map(file => ({
//               fileName: file.file_name,
//               filePath: file.file_path,
//               mimeType: file.mime_type,
//               fileSize: file.file_size,
//             }));
//             console.log(`Attachments for contract ${contract.id}:`, attachments);
//           }

//           // Send email
//           const { error: emailError } = await supabaseClient
//             .from('emails')
//             .insert({
//               from: 'DSPA-RWANDA <dspamanager@gmail.com>',
//               subject: `Contract Expiration Reminder: ${contract.offeror_name}`,
//               body: emailBody,
//               to: primaryEmail,
//               cc: finalCC.length > 0 ? finalCC.join(',') : null,
//               headers: { 'Content-Type': 'text/html; charset=UTF-8' },
//               attachments: attachments.length > 0 ? attachments : undefined,
//             });

//           if (emailError) {
//             console.error(`Error sending email for contract ${contract.id}:`, emailError);
//             throw emailError;
//           }

//           // Update the sent status to true after sending the email
//           const { error: updateError } = await supabaseClient
//             .from('contract_client_emails')
//             .update({ sent: true })
//             .match({ emails: emailClient.emails });

//           if (updateError) {
//             console.error(`Error updating sent status for contract ${contract.id}:`, updateError);
//             throw updateError;
//           }

//           console.log(`Email sent successfully for contract ${contract.id}`);
//         }
//       } else {
//         console.log(`Today is not the reminder date for contract ${contract.id}`);
//       }
//     }

//     return new Response(
//       JSON.stringify({ message: 'Reminder emails sent successfully' }),
//       {
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//         status: 200,
//       }
//     );
//   } catch (error) {
//     console.error('Error in serve function:', error);
//     return new Response(
//       JSON.stringify({ error: (error as Error).message }),
//       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
//     );
//   }
// });

// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// // Function to clean up the signature by removing encoding artifacts
// function cleanUpSignature(signature: string): string {
//   return signature
//     .replace(/=\r?\n/g, '') // Remove soft line breaks
//     .replace(/=[0-9A-F]{2}/g, (match: string) => { // Decode quoted-printable characters
//       try {
//         const char = String.fromCharCode(parseInt(match.substring(1), 16));
//         return char !== ' ' ? char : match; // Only replace if not a space
//       } catch {
//         return match; // In case of an error, leave it as is
//       }
//     });
// }

// // Function to get the email signature from Supabase
// async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
//   try {
//     const { data, error } = await supabaseClient
//       .from('signatures')
//       .select('signature_html')
//       .single();

//     if (error) throw error;
//     return data ? cleanUpSignature(data.signature_html) : null;
//   } catch (error) {
//     console.error('Error fetching signature:', error);
//     return null;
//   }
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseClient = createClient(
//       Deno.env.get('MY_SUPABASE_URL') ?? '',
//       Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     const today = new Date();
//     console.log(`Today's date: ${today.toISOString()}`);

//     // Fetch contracts with client emails and the sent status
//     const { data: contracts, error: contractsError } = await supabaseClient
//       .from('contracts')
//       .select(`
//         id, offeror_name, type, description, start_date, end_date,
//         contract_client_emails (emails, sent)
//       `);

//     if (contractsError) {
//       console.error('Error fetching contracts:', contractsError);
//       throw contractsError;
//     }

//     console.log(`Fetched ${contracts.length} contracts`);

//     // Fetch the email signature from the database
//     const emailSignature = await getEmailSignature(supabaseClient);
//     console.log('Email signature fetched:', emailSignature ? 'Yes' : 'No');

//     for (const contract of contracts) {
//       const startDate = new Date(contract.start_date);
//       const endDate = new Date(contract.end_date);

//       // Calculate contract duration in days
//       const contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
//       console.log(`Contract ${contract.id} duration: ${contractDuration} days`);

//       // Determine reminder period
//       const reminderDaysBefore = contractDuration > 30 ? 30 : 5;
//       console.log(`Reminder days before end date: ${reminderDaysBefore}`);

//       // Calculate the reminder date
//       const reminderDate = new Date(endDate);
//       reminderDate.setDate(endDate.getDate() - reminderDaysBefore);
//       console.log(`Reminder date for contract ${contract.id}: ${reminderDate.toISOString()}`);

//       // Check if today is the reminder date or the reminder date has passed
//       if (today.toISOString().split('T')[0] === reminderDate.toISOString().split('T')[0] || reminderDate < today) {
//         console.log(`Today is the reminder date or the reminder date has passed for contract ${contract.id}`);

//         if (contract.contract_client_emails && contract.contract_client_emails.length > 0) {
//           const emailClient = contract.contract_client_emails[0];

//           // Check if the email has already been sent
//           if (emailClient.sent) {
//             console.log(`Email already sent for contract ${contract.id}`);
//             continue; // Skip if the email has already been sent
//           }

//           // Extract emails
//           const emailList = emailClient.emails.split(',').map((email: string) => email.trim());
//           console.log(`Emails to send for contract ${contract.id}:`, emailList);

//           // Ensure at least one email exists
//           if (emailList.length === 0) {
//             console.log(`No emails found for contract ${contract.id}`);
//             continue;
//           }

//           const primaryEmail = emailList[0]; // First email is the main recipient
//           const ccEmails = emailList.slice(1); // Remaining emails go to CC
//           const defaultCC = [
//             'dspa.rw@gmail.com',  // Default CC 1
//             'tjbsaved@dspa.rw',   // Default CC 2
//           ];
//           const finalCC = [...defaultCC, ...ccEmails];
//           console.log(`Primary email: ${primaryEmail}, CC emails: ${finalCC.join(', ')}`);

//           // Prepare HTML email body with signature
//           const emailBody = `
// <html>
//   <body>
//     <p>Dear Client,</p>
//     <p>This is a reminder that your contract with <strong>DSPA(R) LTD</strong> is approaching its end date.</p>
//     <table border="1" cellpadding="5">
//       <tr>
//         <th>Contract Details:</th>
//       </tr>
//       <tr>
//         <td><strong>Offeror:</strong> ${contract.offeror_name}</td>
//       </tr>
//       <tr>
//         <td><strong>Type:</strong> ${contract.type}</td>
//       </tr>
//       <tr>
//         <td><strong>Description:</strong> ${contract.description}</td>
//       </tr>
//       <tr>
//         <td><strong>Start Date:</strong> ${contract.start_date}</td>
//       </tr>
//       <tr>
//         <td><strong>End Date:</strong> ${contract.end_date}</td>
//       </tr>
//     </table>
//     <p>Please take necessary action.</p>
//     <p>Best regards,</p>
//     <p>DSPA-RWANDA</p>
//     ${emailSignature ? `<br><br>${emailSignature}` : ''}
//   </body>
// </html>
// `;

//           // Fetch contract files (optional, as files might not be uploaded)
//           const { data: contractFiles, error: filesError } = await supabaseClient
//             .from('contract_files')
//             .select('id, file_name, file_path, mime_type, file_size')
//             .eq('contract_id', contract.id);

//           if (filesError) throw filesError;

//           // Prepare attachments
//           let attachments: string | any[] | undefined = [];
//           if (contractFiles && contractFiles.length > 0) {
//             attachments = contractFiles.map(file => ({
//               fileName: file.file_name,
//               filePath: file.file_path,
//               mimeType: file.mime_type,
//               fileSize: file.file_size,
//             }));
//             console.log(`Attachments for contract ${contract.id}:`, attachments);
//           }

//           // Send email
//           const { error: emailError } = await supabaseClient
//             .from('emails')
//             .insert({
//               from: 'DSPA-RWANDA <dspamanager@gmail.com>',
//               subject: `Contract Expiration Reminder: ${contract.offeror_name}`,
//               body: emailBody,
//               to: primaryEmail,
//               cc: finalCC.length > 0 ? finalCC.join(',') : null,
//               headers: { 'Content-Type': 'text/html; charset=UTF-8' },
//               attachments: attachments.length > 0 ? attachments : undefined,
//             });

//           if (emailError) {
//             console.error(`Error sending email for contract ${contract.id}:`, emailError);
//             throw emailError;
//           }

//           // Update the sent status to true after sending the email
//           const { error: updateError } = await supabaseClient
//             .from('contract_client_emails')
//             .update({ sent: true })
//             .match({ emails: emailClient.emails });

//           if (updateError) {
//             console.error(`Error updating sent status for contract ${contract.id}:`, updateError);
//             throw updateError;
//           }

//           console.log(`Email sent successfully for contract ${contract.id}`);
//         }
//       } else {
//         console.log(`Today is not the reminder date for contract ${contract.id}`);
//       }
//     }

//     return new Response(
//       JSON.stringify({ message: 'Reminder emails sent successfully' }),
//       {
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//         status: 200,
//       }
//     );
//   } catch (error) {
//     console.error('Error in serve function:', error);
//     return new Response(
//       JSON.stringify({ error: (error as Error).message }),
//       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
//     );
//   }
// });

// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
// import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';


// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

// // Function to clean up the signature by removing encoding artifacts
// function cleanUpSignature(signature: string): string {
//   return signature
//     .replace(/=\r?\n/g, '') // Remove soft line breaks
//     .replace(/=[0-9A-F]{2}/g, (match: string) => { // Decode quoted-printable characters
//       try {
//         const char = String.fromCharCode(parseInt(match.substring(1), 16));
//         return char !== ' ' ? char : match; // Only replace if not a space
//       } catch {
//         return match; // In case of an error, leave it as is
//       }
//     });
// }

// // Function to get the email signature from Supabase
// async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
//   try {
//     const { data, error } = await supabaseClient
//       .from('signatures')
//       .select('signature_html')
//       .single();

//     if (error) throw error;
//     return data ? cleanUpSignature(data.signature_html) : null;
//   } catch (error) {
//     console.error('Error fetching signature:', error);
//     return null;
//   }
// }

// // Function to send email using Gmail
// async function sendEmail(
//   to: string,
//   cc: string[],
//   subject: string,
//   htmlBody: string,
//   attachments?: { fileName: string; filePath: string; mimeType?: string }[]
// ) {
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
//       from: 'DSPA-RWANDA <dspamanager@gmail.com>',
//       to,
//       cc: cc.join(','),
//       subject,
//       content: htmlBody,
//       html: htmlBody,
//       attachments: attachments?.map((attachment) => ({
//         filename: attachment.fileName,
//         path: attachment.filePath,
//         contentType: attachment.mimeType || 'application/pdf',
//       })),
//     });

//     console.log('Email sent successfully');
//   } catch (error) {
//     console.error('Error sending email:', error);
//     throw error;
//   } finally {
//     await client.close();
//   }
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders });
//   }

//   try {
//     const supabaseClient = createClient(
//       Deno.env.get('MY_SUPABASE_URL') ?? '',
//       Deno.env.get('MY_SUPABASE_SERVICE_ROLE_KEY') ?? ''
//     );

//     const today = new Date();
//     console.log(`Today's date: ${today.toISOString()}`);

//     // Fetch contracts with client emails and the sent status
//     const { data: contracts, error: contractsError } = await supabaseClient
//       .from('contracts')
//       .select(
//         `id, offeror_name, type, description, start_date, end_date,
//         contract_client_emails (emails, sent)`
//       );

//     if (contractsError) throw contractsError;

//     console.log(`Fetched ${contracts.length} contracts`);

//     // Fetch the email signature from the database
//     const emailSignature = await getEmailSignature(supabaseClient);
//     console.log('Email signature fetched:', emailSignature ? 'Yes' : 'No');

//     for (const contract of contracts) {
//       const startDate = new Date(contract.start_date);
//       const endDate = new Date(contract.end_date);

//       // Calculate contract duration
//       const contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
//       console.log(`Contract ${contract.id} duration: ${contractDuration} days`);

//       // Determine reminder period
//       const reminderDaysBefore = contractDuration > 30 ? 30 : 5;
//       console.log(`Reminder days before end date: ${reminderDaysBefore}`);

//       // Calculate the reminder date
//       const reminderDate = new Date(endDate);
//       reminderDate.setDate(endDate.getDate() - reminderDaysBefore);
//       console.log(`Reminder date for contract ${contract.id}: ${reminderDate.toISOString()}`);

//       // Check if today is the reminder date or the reminder date has passed
//       if (today.toISOString().split('T')[0] === reminderDate.toISOString().split('T')[0] || reminderDate < today) {
//         console.log(`Today is the reminder date or the reminder date has passed for contract ${contract.id}`);

//         if (contract.contract_client_emails && contract.contract_client_emails.length > 0) {
//           const emailClient = contract.contract_client_emails[0];

//           // Check if the email has already been sent
//           if (emailClient.sent) {
//             console.log(`Email already sent for contract ${contract.id}`);
//             continue; // Skip if the email has already been sent
//           }

//           // Extract emails
//           const emailList = emailClient.emails.split(',').map((email: string) => email.trim());
//           console.log(`Emails to send for contract ${contract.id}:`, emailList);

//           // Ensure at least one email exists
//           if (emailList.length === 0) {
//             console.log(`No emails found for contract ${contract.id}`);
//             continue;
//           }

//           const primaryEmail = emailList[0]; // First email is the main recipient
//           const ccEmails = emailList.slice(1); // Remaining emails go to CC
//           const defaultCC = [
//             'dspa.rw@gmail.com',  // Default CC 1
//             'tjbsaved@dspa.rw',   // Default CC 2
//           ];
//           const finalCC = [...defaultCC, ...ccEmails];
//           console.log(`Primary email: ${primaryEmail}, CC emails: ${finalCC.join(', ')}`);

//           // Prepare HTML email body with signature
//           const emailBody = `
// <html>
//   <body>
//     <p>Dear Client,</p>
//     <p>This is a reminder that your contract with <strong>DSPA(R) LTD</strong> is approaching its end date.</p>
//     <table border="1" cellpadding="5">
//       <tr>
//         <th>Contract Details:</th>
//       </tr>
//       <tr>
//         <td><strong>Offeror:</strong> ${contract.offeror_name}</td>
//       </tr>
//       <tr>
//         <td><strong>Type:</strong> ${contract.type}</td>
//       </tr>
//       <tr>
//         <td><strong>Description:</strong> ${contract.description}</td>
//       </tr>
//       <tr>
//         <td><strong>Start Date:</strong> ${contract.start_date}</td>
//       </tr>
//       <tr>
//         <td><strong>End Date:</strong> ${contract.end_date}</td>
//       </tr>
//     </table>
//     <p>Please take necessary action.</p>
//     <p>Best regards,</p>
//     <p>DSPA-RWANDA</p>
//     ${emailSignature ? `<br><br>${emailSignature}` : ''}
//   </body>
// </html>
// `;

//           // Fetch contract files (optional, as files might not be uploaded)
//           const { data: contractFiles, error: filesError } = await supabaseClient
//             .from('contract_files')
//             .select('id, file_name, file_path, mime_type, file_size')
//             .eq('contract_id', contract.id);

//           if (filesError) throw filesError;

//           // Prepare attachments
//           let attachments: { fileName: string; filePath: string; mimeType?: string; }[] | { fileName: any; filePath: any; mimeType: any; }[] | undefined = [];
//           if (contractFiles && contractFiles.length > 0) {
//             attachments = contractFiles.map((file) => ({
//               fileName: file.file_name,
//               filePath: file.file_path,
//               mimeType: file.mime_type,
//             }));
//             console.log(`Attachments for contract ${contract.id}:`, attachments);
//           }

//           // Send email using Gmail
//           await sendEmail(
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET_URL = 'https://gubkroeupedoqlnjnxze.supabase.co/storage/v1/object/public/';

async function getEmailSignature(supabaseClient: SupabaseClient): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from('signatures')
      .select('signature_html')
      .single();

    if (error) throw error;
    return data?.signature_html || null; // Return raw HTML without processing
  } catch (error) {
    console.error('Error fetching signature:', error);
    return null;
  }
}


async function fetchFileContent(filePath: string): Promise<Uint8Array> {
  const fullPath = `${BUCKET_URL}${filePath}`;
  const encodedPath = fullPath.split('/').map(component => 
    encodeURIComponent(component)
  ).join('/');
  
  const response = await fetch(encodedPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function sendGmailEmail(
  to: string,
  cc: string[],
  subject: string,
  htmlBody: string,
  attachments?: { filename: string; content: Uint8Array; contentType: string }[]
): Promise<void> {
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

  try {
    await client.send({
      from: 'DSPA-RWANDA <dspamanager@gmail.com>',
      to,
      cc: cc.join(','),
      subject,
      content: htmlBody,
      html: htmlBody,
      attachments: attachments?.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
        encoding: 'binary',
      })),
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  } finally {
    await client.close();
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
    console.log(`Today's date: ${today.toISOString()}`);

    const { data: contracts, error: contractsError } = await supabaseClient
      .from('contracts')
      .select(
        `id, offeror_name, type, description, start_date, end_date,
        contract_client_emails (emails, sent)`
      );

    if (contractsError) throw contractsError;
    console.log(`Fetched ${contracts.length} contracts`);

    const emailSignature = await getEmailSignature(supabaseClient);
    console.log('Email signature fetched:', emailSignature ? 'Yes' : 'No');

    for (const contract of contracts) {
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);

      const contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`Contract ${contract.id} duration: ${contractDuration} days`);

      const reminderDaysBefore = contractDuration > 30 ? 30 : 5;
      console.log(`Reminder days before end date: ${reminderDaysBefore}`);

      const reminderDate = new Date(endDate);
      reminderDate.setDate(endDate.getDate() - reminderDaysBefore);
      console.log(`Reminder date for contract ${contract.id}: ${reminderDate.toISOString()}`);

      // Check if today is the reminder date or if the reminder date has passed
      if (today.toISOString().split('T')[0] === reminderDate.toISOString().split('T')[0] || 
          reminderDate < today) {
        console.log(`Processing contract ${contract.id} for reminder`);

        if (contract.contract_client_emails && contract.contract_client_emails.length > 0) {
          const emailClient = contract.contract_client_emails[0];

          if (emailClient.sent) {
            console.log(`Email already sent for contract ${contract.id}`);
            continue;
          }

          const emailList = emailClient.emails.split(',').map((email: string) => email.trim());
          if (emailList.length === 0) {
            console.log(`No emails found for contract ${contract.id}`);
            continue;
          }

          const primaryEmail = emailList[0];
          const ccEmails = emailList.slice(1);
          const defaultCC = [
            'dspa.rw@gmail.com',
            'tjbsaved@dspa.rw',
          ];
          const finalCC = [...ccEmails, ...defaultCC];
          console.log(`Primary email: ${primaryEmail}, CC emails: ${finalCC.join(', ')}`);

          const emailBody = `
<html>
  <body>
    <p>Dear Client,</p>
    <p>This is a reminder that your contract with <strong>DSPA(R) LTD</strong> is approaching its end date.</p>
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
    <p>Please take necessary action.</p>
    <p>Best regards,</p>
    <p>DSPA-RWANDA</p>
    ${emailSignature || ''} <!-- Directly include the raw HTML signature -->
  </body>
</html>`;

          // Fetch the contract file from contract_files table
          const { data: contractFiles, error: filesError } = await supabaseClient
            .from('contract_files')
            .select('id, file_name, file_path, mime_type')
            .eq('contract_id', contract.id);

          if (filesError) throw filesError;

          const attachments = [];
          if (contractFiles && contractFiles.length > 0) {
            // Get the main contract file (assuming it's the first one)
            const contractFile = contractFiles[0];
            try {
              const fileContent = await fetchFileContent(contractFile.file_path);
              attachments.push({
                filename: contractFile.file_name,
                content: fileContent,
                contentType: contractFile.mime_type || 'application/pdf',
              });
              console.log(`Prepared contract attachment: ${contractFile.file_name}`);
            } catch (fileError) {
              console.error(`Error fetching contract file: ${fileError}`);
            }
          }

          try {
            await sendGmailEmail(
              primaryEmail,
              finalCC,
              `Contract Expiration Reminder: ${contract.offeror_name}`,
              emailBody,
              attachments
            );

            // Update the sent status only after successful email sending
            const { error: updateError } = await supabaseClient
              .from('contract_client_emails')
              .update({ sent: true })
              .match({ emails: emailClient.emails });

            if (updateError) throw updateError;
            console.log(`Successfully sent and updated status for contract ${contract.id}`);
          } catch (emailError) {
            console.error(`Failed to send email for contract ${contract.id}:`, emailError);
            throw emailError;
          }
        }
      } else {
        console.log(`Not yet time to send reminder for contract ${contract.id}`);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Reminder emails processed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in serve function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});