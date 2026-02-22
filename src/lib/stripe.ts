import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — payments disabled.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2026-01-28.clover",
});

export default stripe;

export const PRO_PRICE_CENTS = 4900; // $49.00/month
export const PRO_MONTHLY_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? ""; // Stripe Price ID
