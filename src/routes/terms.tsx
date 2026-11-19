import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout, LegalSection, SUPPORT_EMAIL } from "@/components/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | Resume Match" },
      {
        name: "description",
        content: "The terms that govern your use of Resume Match, the AI resume scoring and rewrite service sold by Resume Match.",
      },
      { property: "og:title", content: "Terms & Conditions | Resume Match" },
      { property: "og:description", content: "The terms that govern your use of Resume Match." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions">
      <LegalSection title="1. Who you are buying from">
        <p>
          Resume Match ("we", "us", "the seller") is based in the United States. When you buy
          or use Resume Match, your contract is with Resume Match. You can reach us at {SUPPORT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection title="2. Accepting these terms">
        <p>
          By using Resume Match, you agree to these terms. If you do not agree, please do not use the service. You
          confirm that you are old enough to enter a binding contract in your country, and, if you use the service for
          an organization, that you are allowed to bind that organization.
        </p>
      </LegalSection>

      <LegalSection title="3. What Resume Match does">
        <p>
          Resume Match is an AI-powered tool that scores your resume against a job description and the applicant
          tracking system (ATS) you choose, then offers a suggested rewrite. A one-time payment of $19 buys a pack of
          10 reports, delivered through an access code. No account is needed and nothing renews.
        </p>
        <p>
          Scores and rewrites are AI-generated guidance. They may be inaccurate or incomplete, and they are not
          career, legal or other professional advice. We do not promise interviews, job offers or any particular
          outcome.
        </p>
      </LegalSection>

      <LegalSection title="4. Using the service fairly">
        <p>You must not misuse Resume Match. That means you must not:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>use it for anything unlawful, fraudulent or deceptive, including spam;</li>
          <li>submit content you have no right to use, or that infringes someone else's intellectual property;</li>
          <li>submit content that is hateful, harassing, or that depicts real people without their consent;</li>
          <li>try to break, probe, overload or scrape the service, or introduce malware;</li>
          <li>try to bypass the access code system or other technical limits;</li>
          <li>attempt to jailbreak the AI or make it produce harmful or illegal output;</li>
          <li>resell, redistribute or share your access code publicly.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Your content and the AI output">
        <p>
          You keep all rights to the resume and job description you submit. You give us a limited license to process
          that content only to produce your score and rewrite. We do not store your resume or job description: they
          are processed to create your report and then discarded.
        </p>
        <p>
          You are responsible for what you submit, for having the rights to it, and for checking the accuracy of any
          rewrite before you use it. The AI must never invent experience, titles, dates, skills or numbers, but you
          should still review every suggestion before sending it to an employer.
        </p>
        <p>
          If you believe content produced through the service infringes your rights, email {SUPPORT_EMAIL} and we
          will review and remove or restrict it where appropriate. Repeated infringement by a user can lead to
          suspension.
        </p>
      </LegalSection>

      <LegalSection title="6. Payments">
        <p>
          Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for
          all our orders. Paddle provides all customer service inquiries and handles returns.
        </p>
        <p>
          Payment, billing, tax, cancellation and refund mechanics are governed by Paddle's Buyer Terms at
          https://www.paddle.com/legal/checkout-buyer-terms. Each pack is a single one-time payment; there are no
          subscriptions and no automatic renewals.
        </p>
      </LegalSection>

      <LegalSection title="7. Our intellectual property">
        <p>
          We own the Resume Match service, including its software, design, documentation and branding. We give you a
          limited, non-exclusive, non-transferable right to use the service within the pack you bought. You may not
          copy, reverse engineer or resell any part of the service.
        </p>
      </LegalSection>

      <LegalSection title="8. Service availability">
        <p>
          We work hard to keep Resume Match available, but we do not guarantee it will be uninterrupted or error
          free. We may change, suspend or withdraw parts of the service, for example for maintenance or security
          reasons.
        </p>
      </LegalSection>

      <LegalSection title="9. Suspension and termination">
        <p>
          We may suspend or end your access if you materially break these terms, if payment is reversed or not made,
          if your use creates a security or fraud risk, or if you repeatedly or seriously violate these rules. If
          your access ends for a breach, unused reports may be forfeited.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers and limits of liability">
        <p>
          The service is provided "as is". To the fullest extent permitted by law, we disclaim all implied
          warranties, including merchantability and fitness for a particular purpose. We are not liable for
          indirect, consequential or special damages, including lost profits, lost data or lost opportunities. Our
          total liability to you is capped at the amount you paid us in the 12 months before the claim. Nothing in
          these terms limits liability for fraud, death or personal injury where the law does not allow it.
        </p>
      </LegalSection>

      <LegalSection title="11. Governing law">
        <p>
          These terms are governed by the laws of the United States and the state in which the seller is based,
          without regard to conflict of law rules.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes and contact">
        <p>
          We may update these terms from time to time; the "last updated" date above shows the current version.
          Questions? Email {SUPPORT_EMAIL}.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
