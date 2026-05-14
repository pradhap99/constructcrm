import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Target, Receipt } from 'lucide-react'
import { getClientById } from '@/actions/clients'
import { listProjectsForTenant, listClientsForPicker } from '@/actions/projects'
import { listTendersForTenant } from '@/actions/tenders'
import {
  listBillsForTenant,
  listProjectsForBillPicker,
  getTenantBillDefaults,
} from '@/actions/bills'
import { ClientTypeBadge } from '@/components/clients/client-type-badge'
import { BillRow } from '@/components/bills/bill-row'
import { CreateBillButton } from '@/components/bills/bill-form'
import { ContactActionButtons } from '@/components/clients/contact-action-buttons'
import { ContactsEditor } from '@/components/clients/contacts-editor'
import { NotesEditor } from '@/components/clients/notes-editor'
import { ProjectCard } from '@/components/projects/project-card'
import { CreateProjectButton } from '@/components/projects/create-project-modal'
import { TenderCard } from '@/components/tenders/tender-card'
import { CreateTenderButton } from '@/components/tenders/create-tender-modal'
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

  const [projects, allClients, tenders, bills, allProjects, billDefaults] = await Promise.all([
    listProjectsForTenant({ clientId: client.id }),
    listClientsForPicker(),
    listTendersForTenant({ clientId: client.id }),
    listBillsForTenant({ clientId: client.id }),
    listProjectsForBillPicker(),
    getTenantBillDefaults(),
  ])

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
          {projects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground/40" />
              <h3 className="text-sm font-medium">No projects under this client yet</h3>
              <p className="max-w-sm text-xs text-muted-foreground">
                Add the first project — bills and variations will then live under it.
              </p>
              <CreateProjectButton clients={allClients} presetClientId={client.id} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {projects.length} project{projects.length === 1 ? '' : 's'} under{' '}
                  {client.name}
                </p>
                <CreateProjectButton clients={allClients} presetClientId={client.id} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="tenders">
          {tenders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <Target className="h-8 w-8 text-muted-foreground/40" />
              <h3 className="text-sm font-medium">No tenders for this client yet</h3>
              <p className="max-w-sm text-xs text-muted-foreground">
                Track an EOI or live bid against this client.
              </p>
              <CreateTenderButton clients={allClients} presetClientId={client.id} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {tenders.length} tender{tenders.length === 1 ? '' : 's'} for {client.name}
                </p>
                <CreateTenderButton clients={allClients} presetClientId={client.id} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tenders.map((t) => (
                  <TenderCard key={t.id} tender={t} clientsForPicker={allClients} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="bills">
          {bills.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground/40" />
              <h3 className="text-sm font-medium">No bills under this client yet</h3>
              <p className="max-w-sm text-xs text-muted-foreground">
                Bills are raised against projects. The first one shows up here once a project
                under {client.name} has a bill.
              </p>
              {allProjects.length > 0 && (
                <CreateBillButton projects={allProjects} defaults={billDefaults} />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {bills.length} bill{bills.length === 1 ? '' : 's'} across {client.name}
                  &rsquo;s projects
                </p>
                <CreateBillButton projects={allProjects} defaults={billDefaults} />
              </div>
              <div className="space-y-2">
                {bills.map((b) => (
                  <BillRow key={b.id} bill={b} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <ContactsEditor clientId={client.id} initial={client.contacts ?? []} />
        <NotesEditor clientId={client.id} initialNotes={client.notes} />
      </section>
    </div>
  )
}
