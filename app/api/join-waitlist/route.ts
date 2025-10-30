import { supabaseAdmin } from "@/lib/supabaseClient";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  
  // Validate email
  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
  }

  // Basic email validation
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: "Please enter a valid email address" }), { status: 400 });
  }

  try {
    // Check if email already exists in waitlist
    const { data: existingEmail, error: checkError } = await supabaseAdmin
      .from('waitlist')
      .select('email, created_at, status')
      .eq('email', email.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Database check error:', checkError);
      return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }

    if (existingEmail) {
      return new Response(JSON.stringify({ 
        error: "This email is already registered on our waitlist!",
        alreadyRegistered: true,
        registeredAt: existingEmail.created_at
      }), { status: 409 }); // 409 Conflict
    }

    // Insert new email into waitlist
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('waitlist')
      .insert([
        { 
          email: email.toLowerCase(),
          source: 'website',
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      
      // Handle unique constraint violation (in case of race condition)
      if (insertError.code === '23505') { // Unique violation
        return new Response(JSON.stringify({ 
          error: "This email is already registered on our waitlist!",
          alreadyRegistered: true
        }), { status: 409 });
      }
      
      return new Response(JSON.stringify({ error: "Failed to join waitlist" }), { status: 500 });
    }

    // Send welcome email
    try {
      const emailTemplate = emailTemplates.waitlistWelcome(email);
      await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails, user is still added to waitlist
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Successfully joined the waitlist!",
      data: insertData 
    }), { status: 200 });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), { status: 500 });
  }
}
