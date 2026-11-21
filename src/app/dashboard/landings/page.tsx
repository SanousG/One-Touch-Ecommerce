import { LandingList } from "@/components/landings/landing-list";
import { listProducts } from "@/lib/catalog/service";
import { listLandings, requireLandingActor } from "@/lib/landings/service";

export const dynamic = "force-dynamic";

export default async function LandingsPage() {
  const actor = await requireLandingActor();
  const [landings, products] = await Promise.all([
    listLandings(actor),
    listProducts(actor),
  ]);
  return <LandingList landings={landings} products={products} />;
}
