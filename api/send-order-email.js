module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId, customerEmail, customerName, total } = req.body;

    if (!orderId || !customerEmail) {
      return res.status(400).json({ error: "Missing orderId or customerEmail" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
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
      return res.status(500).json({ error: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
};