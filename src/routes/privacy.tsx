import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Coach Tushar Raut IKMP" },
      { name: "description", content: "Privacy Policy for the Indian Kitchen Meal Plan app by Coach Tushar Raut." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 prose prose-neutral">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 29, 2026</p>

      <p className="mt-6">
        This Privacy Policy describes how Coach Tushar Raut ("we", "us", "our") collects, uses, and protects
        information when you use the Indian Kitchen Meal Plan ("IKMP") app and website (the "Service").
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Information We Collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Account information:</strong> name, email address, and authentication identifier when you sign up or log in (including Google sign-in).</li>
        <li><strong>App content:</strong> meal plans, grocery lists, and preferences you create within the app.</li>
        <li><strong>Technical data:</strong> device type, app version, log data, and crash reports used to keep the app reliable.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">How We Use Information</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>To provide and personalize recipes, meal plans and grocery lists.</li>
        <li>To authenticate you and secure your account.</li>
        <li>To improve the Service, fix bugs, and develop new features.</li>
        <li>To communicate important updates about your account or the Service.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Data Sharing</h2>
      <p>
        We do not sell your personal data. We share data only with trusted service providers required to run the
        Service (such as cloud hosting, authentication and database providers), and only as needed to operate
        the app. We may disclose data if required by law.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Data Security</h2>
      <p>
        We use industry-standard safeguards including encrypted connections (HTTPS) and access controls
        (Row Level Security) to protect your data. No method of transmission or storage is 100% secure.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Data Retention</h2>
      <p>
        We retain your account data while your account is active. You may request deletion at any time
        via the in-app <a href="/delete-account" className="underline">Delete Account</a> page, after which
        your account and associated personal data are removed.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Children's Privacy</h2>
      <p>The Service is not directed to children under 13, and we do not knowingly collect data from them.</p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Your Rights</h2>
      <p>
        You may access, correct, or delete your personal information at any time from within the app, or by
        contacting us at the email below.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Third-Party Services</h2>
      <p>
        We use Google Sign-In for authentication and managed cloud infrastructure for storage and database.
        Their use of information is governed by their own privacy policies.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be reflected by the
        "Last updated" date above.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
      <p>
        For privacy questions or requests, contact: <strong>coach@coachtusharraut.com</strong>
      </p>
    </div>
  );
}
