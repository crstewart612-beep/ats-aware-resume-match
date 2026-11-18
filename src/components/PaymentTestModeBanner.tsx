import { getPaddleEnvironment } from "@/lib/paddle";

/** Shows a notice in the preview, where payments are simulated. Renders nothing once live. */
export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;

  return (
    <div className="w-full border-b border-border bg-secondary px-4 py-2 text-center text-sm text-muted-foreground">
      Payments in this preview are in test mode, so no one is charged.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline"
      >
        Read more
      </a>
    </div>
  );
}
