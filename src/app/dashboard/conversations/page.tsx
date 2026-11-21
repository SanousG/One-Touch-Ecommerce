import { InboxView } from "@/components/whatsapp/inbox-view";
import { getPrisma } from "@/lib/db/prisma";
import { getConversation, listConversations, requireInboxActor } from "@/lib/whatsapp/conversations";
import { getInboxConnectionStatus } from "@/lib/whatsapp/service";

export const dynamic = "force-dynamic";

type Search = { conversation?: string; status?: string; q?: string };

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await requireInboxActor();
  const filters = await searchParams;
  const [conversations, connection, memberships] = await Promise.all([
    listConversations(actor, filters.status, filters.q),
    getInboxConnectionStatus(actor),
    getPrisma().tenantMembership.findMany({
      where: { tenantId: actor.tenantId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  let detail = null;
  if (filters.conversation) {
    try { detail = await getConversation(actor, filters.conversation); } catch { detail = null; }
  }

  return (
    <InboxView
      conversations={conversations}
      detail={detail}
      connection={connection}
      users={memberships.map((membership) => membership.user)}
    />
  );
}
