import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout, LegalSection, SELLER_NAME, SUPPORT_EMAIL } from "@/components/LegalLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice | Resume Match" },
      {
        name: "description",
        content: "How Resume Match handles your data: resumes are never stored, and we keep only your access code and usage counts.",
      },
      { property: "og:title", content: "Privacy Notice | Resume Match" },
      { property: "og:description", content: "Resumes are never stored. We keep only your access code and usage counts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Notice">
      <LegalSection title="Who is responsible for your data">
        <p>
          Resume Match is operated by {SELLER_NAME}, based in the United States. {SELLER_NAME} is the data
          controller for the personal data described in this notice. You can contact us at {SUPPORT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Access code and usage counts.</strong> When you buy a pack, we store
            the access code you were given and how many reports and rewrites it has used, so the pack works.
          </li>
          <li>
            <strong className="text-foreground">Support messages.</strong> If you email us, we keep your email
            address and the conversation so we can help you.
          </li>
          <li>
            <strong className="text-foreground">Technical and usage data.</strong> Pages visited, where visitors
            came from, country, browser, operating system, device type, time on page, page speed and errors, and
            which buttons and links are clicked (see "Visitor analytics" below).
          </li>
        </ul>
        <p>
          <strong className="text-foreground">What we do not collect:</strong> your resume and job descriptions are
          never stored. They are processed to create your score and rewrite, then discarded. We also never see your
          card details; payment is handled entirely by Paddle.
        </p>
      </LegalSection>

      <LegalSection title="Why we use it and our legal basis">
        <ul className="list-disc space-y-1 pl-5">
          <li>To provide the service you bought (performance of our contract with you).</li>
          <li>To keep the service secure and prevent fraud (our legitimate interests).</li>
          <li>To understand how the site is used and improve it (our legitimate interests).</li>
          <li>To answer your support requests (performance of contract and legitimate interests).</li>
          <li>To meet legal and tax obligations (legal obligation).</li>
        </ul>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Paddle</strong>, our Merchant of Record, who processes the sale,
            payments, tax compliance and invoicing. Paddle has its own privacy terms for the data it collects at
            checkout.
          </li>
          <li>
            <strong className="text-foreground">Service providers</strong> who host and run the site for us,
            including our hosting platform Lovable.
          </li>
          <li>
            <strong className="text-foreground">Professional advisers</strong> such as accountants or lawyers, where
            needed.
          </li>
          <li>
            <strong className="text-foreground">Authorities</strong>, where the law requires it.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Visitor analytics">
        <p>
          This site uses Lovable's built-in visitor analytics. It uses no cookies, stores nothing on your device,
          does not keep your IP address and cannot identify you. Lovable collects this data for us.{" "}
          <a
            href="https://lovable.dev/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Lovable's privacy policy
          </a>{" "}
          explains how it handles it.
        </p>
        <p>
          It records the pages visited, where visitors came from, their country, browser, operating system and
          device type, how long they stay, how fast pages load, errors, and which buttons and links are clicked.
          This is recorded for every visitor, without cookies and without identifying anyone. Detailed data is kept
          for 90 days and daily summaries for a year.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and browser storage">
        <p>
          We do not use cookies. The site saves two things in your browser's own storage so the service works: your
          access code (so you do not have to retype it) and a random browser identifier. Neither is shared with
          advertisers, and clearing your browser storage removes them.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep data">
        <p>
          Access codes and their usage counts are kept while the code is active and for a reasonable period
          afterward for accounting and fraud prevention. Support emails are kept for up to 24 months. Analytics data
          is kept as described above. When data is no longer needed, it is deleted or anonymised.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct or delete your personal data, to
          object to or restrict how we use it, and to receive a copy of it. To exercise any of these rights, email
          {SUPPORT_EMAIL}. We respond within one month. If you are in the EEA or UK, you also have the right to
          complain to your local data protection authority.
        </p>
      </LegalSection>

      <LegalSection title="International transfers">
        <p>
          We are based in the United States and data is processed there. If you visit from outside the US, your
          data will be transferred to and processed in the US, with appropriate safeguards applied by our service
          providers.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use appropriate technical and organisational measures, including encryption in transit and access
          controls, to protect the limited data we hold.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update this notice from time to time; the "last updated" date above shows the current version.
          Questions about privacy? Email {SUPPORT_EMAIL}.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
