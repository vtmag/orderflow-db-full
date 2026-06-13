export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { orderId, customerEmail, customerName, total } = await req.json();

    if (!orderId || !customerEmail) {
      return new Response(JSON.stringify({ error: "Missing orderId or customerEmail" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY as string;

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OrderFlow <onboarding@resend.dev>",
        to: customerEmail,
        subject: `Order Confirmation #${orderId}`,
        html: `
          <h2>Thank you for your order${customerName ? `, ${customerName}` : ""}!</h2>
          <p>Your order has been successfully created.</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Total:</strong> €${Number(total || 0).toFixed(2)}</p>
          <br />
          <p>OrderFlow OMS</p>
        `,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}