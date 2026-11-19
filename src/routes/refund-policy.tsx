import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout, LegalSection, SUPPORT_EMAIL } from "@/components/LegalLayout";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy | Resume Match" },
      {
        name: "description",
        content: "Resume Match offers a 30-day money-back guarantee. Refunds are processed by Paddle.",
      },
      { property: "og:title", content: "Refund Policy | Resume Match" },
      { property: "og:description", content: "A 30-day money-back guarantee on every Resume Match pack." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy">
      <LegalSection title="30-day money-back guarantee">
        <p>
          We offer a 30-day money-back guarantee. If you are not satisfied with your purchase, you can request a
          full refund within 30 days of your order date.
        </p>
      </LegalSection>

      <LegalSection title="How to request a refund">
        <p>
          Refunds are processed by our payment provider, Paddle. To request a refund, visit paddle.net and look up
          your order, or email us at {SUPPORT_EMAIL} with the email address you used at checkout and we will help.
        </p>
      </LegalSection>

      <LegalSection title="What happens after a refund">
        <p>
          Once a refund is issued, the access code linked to that purchase is deactivated and any unused reports on
          it stop working. Refunds go back to the original payment method; Paddle's timing depends on your bank or
          card provider.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          Not sure whether your situation qualifies? Just ask. Email {SUPPORT_EMAIL} and we will sort it out with
          you.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
