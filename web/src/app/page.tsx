import LandingNav from "@/components/layout/LandingNav";
import LandingPageContent from "@/components/layout/LandingPageContent";
import { apiGet } from "@/lib/api-server";

type PlanCode = "FREE" | "PLUS" | "PRO";

async function getLandingAccount() {
  try {
    await apiGet<{ id: string }>("/users/me");
    let code = "FREE";
    try {
      const subscription = await apiGet<{ subscription?: { plan?: { code?: string } } }>("/subscriptions/me");
      code = subscription.subscription?.plan?.code ?? "FREE";
    } catch {
      // A signed-in account without a subscription is treated as Free.
    }
    return { loggedIn: true, plan: (code === "PLUS" || code === "PRO" ? code : "FREE") as PlanCode };
  } catch {
    return { loggedIn: false, plan: null as PlanCode | null };
  }
}

export default async function LandingPage() {
  const account = await getLandingAccount();
  return <div className="bg-background"><LandingNav /><LandingPageContent {...account} /></div>;
}
