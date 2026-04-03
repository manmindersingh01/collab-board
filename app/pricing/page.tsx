"use client";

import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for personal projects and small teams getting started.",
    features: [
      "3 boards",
      "5 members per board",
      "100MB storage",
      "Basic Kanban views",
      "Card comments",
      "Activity log",
    ],
    cta: "Get Started",
    ctaLink: "/workspace/new",
    highlight: false,
    color: "bg-neo-white",
  },
  {
    name: "Pro",
    price: "$8",
    period: "/user/month",
    description: "For growing teams that need unlimited capacity and advanced features.",
    features: [
      "Unlimited boards",
      "Unlimited members",
      "5GB storage",
      "Advanced analytics",
      "Priority support",
      "Custom fields (coming soon)",
      "Automations (coming soon)",
    ],
    cta: "Upgrade to Pro",
    ctaLink: "/workspace/new",
    highlight: true,
    color: "bg-neo-yellow",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations needing SSO, compliance, and dedicated support.",
    features: [
      "Everything in Pro",
      "50GB storage",
      "SSO / SAML",
      "Audit logs",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    ctaLink: "mailto:sales@collabboard.app",
    highlight: false,
    color: "bg-neo-white",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <div className="text-center py-16 px-6">
        <h1 className="text-4xl sm:text-5xl font-black mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-neo-muted max-w-xl mx-auto">
          Start free, upgrade when you need more. No hidden fees, no surprises.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6 stagger-grid">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`neo-card p-0 flex flex-col ${
                tier.highlight ? "ring-4 ring-neo-black scale-105 relative" : ""
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="neo-badge bg-neo-blue text-white px-4 py-1 text-xs">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`p-6 ${tier.color} rounded-t-md border-b-2 border-neo-black`}>
                <h2 className="text-xl font-black mb-1">{tier.name}</h2>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black">{tier.price}</span>
                  {tier.period && (
                    <span className="text-sm text-neo-muted">{tier.period}</span>
                  )}
                </div>
                <p className="text-sm text-neo-muted">{tier.description}</p>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <ul className="space-y-3 flex-1 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="text-neo-teal shrink-0 mt-0.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaLink}
                  className={`neo-btn w-full text-center ${
                    tier.highlight ? "neo-btn-primary" : "neo-btn-ghost"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ / Feature Comparison */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-black text-center mb-8">Feature Comparison</h2>
        <div className="neo-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-neo-black bg-neo-bg">
                <th className="text-left p-4 font-black">Feature</th>
                <th className="text-center p-4 font-black">Free</th>
                <th className="text-center p-4 font-black bg-neo-yellow/30">Pro</th>
                <th className="text-center p-4 font-black">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Boards", "3", "Unlimited", "Unlimited"],
                ["Members per board", "5", "Unlimited", "Unlimited"],
                ["Storage", "100MB", "5GB", "50GB"],
                ["Analytics", "—", "✓", "✓"],
                ["Priority support", "—", "✓", "✓"],
                ["SSO / SAML", "—", "—", "✓"],
                ["Audit logs", "—", "—", "✓"],
                ["SLA guarantee", "—", "—", "✓"],
              ].map(([feature, free, pro, enterprise], i) => (
                <tr
                  key={feature}
                  className={`border-b border-neo-black/10 ${
                    i % 2 === 0 ? "" : "bg-neo-bg/50"
                  }`}
                >
                  <td className="p-4 font-medium">{feature}</td>
                  <td className="p-4 text-center">{free}</td>
                  <td className="p-4 text-center bg-neo-yellow/10 font-bold">{pro}</td>
                  <td className="p-4 text-center">{enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
