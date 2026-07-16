const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { paymentMethodId, plan, email, name, isTrial } = JSON.parse(event.body);

    // Price IDs from Stripe Dashboard
    const PRICES = {
      monthly: "price_1ToWxwQskcopTZMmCidO5p5m",  // $1.99/month
      annual:  "price_1ToWzFQskcopTZMmdkHeDQnb",  // $19.99/year
    };

    // Create customer
    const customer = await stripe.customers.create({
      email,
      name,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create subscription (with optional trial)
    const subscriptionParams = {
      customer: customer.id,
      items: [{ price: PRICES[plan] }],
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    };

    if (isTrial) {
      subscriptionParams.trial_period_days = 7;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      }),
    };
  } catch (err) {
    console.error("Stripe error:", err.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
