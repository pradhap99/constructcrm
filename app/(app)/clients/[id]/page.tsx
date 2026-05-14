import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Target, Receipt } from 'lucide-react'
import { getClientById } from '@/actions/clients'
import { ClientTypeBadge } from '@/components/clients/client-type-badge'
import { ContactActionButtons } from '@/components/clients/contact-action-buttons'
import { ContactsEditor } from '@/components/clients/contacts-editor'
import { NotesEditor } from '@/components/clients/notes-editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/date'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const { id } = await Promise.resolve(params)
  const client = await getClientById(id)
  if (!client) notFound()

  return (
    <div className="p-6 md:p-10">
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All clients
      </Link>

      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <ClientTypeBadge type={client.type} />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Added {formatDate(client.createdAt)}</p>
            {client.gstNumber && (
              <p>
                GST <span className="font-mono">{client.gstNumber}</span>
                {client.panNumber && (
                  <>
                    {' '}
                    · PAN <span className="font-mono">{client.panNumber}</span>
                  </>
                )}
              </p>
            )}
            {client.address && <p>{client.address}</p>}
          </div>
          <ContactActionButtons contacts={client.contacts ?? []} />
        </div>
      </header>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="tenders" className="gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Tenders
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Bills
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <TabPlaceholder
            icon={Building2}
            title="Projects land in Phase 3"
            body="Once Phase 3 ships, this tab will list every project tied to this client, with timeline progress and contract value."
          />
        </TabsContent>
        <TabsContent value="tenders">
          <TabPlaceholder
            icon={Target}
            title="Tenders land in Phase 4"
            body="Active and historical tenders for this client will appear here, with stage and submission deadline."
          />
        </TabsContent>
        <TabsContent value="bills">
          <TabPlaceholder
            icon={Receipt}
            title="Bills land in Phase 5"
            body="Once the bill module ships, this tab rolls up every RA bill across every project tied to this client."
          />
        </TabsContent>
      </Tabs>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <ContactsEditor clientId={client.id} initial={client.contacts ?? []} />
        <NotesEditor clientId={client.id} initialNotes={client.notes} />
      </section>
    </div>
  )
}

function TabPlaceholder({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Building2
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="max-w-sm text-xs text-muted-foreground">{body}</p>
    </div>
  )
}
