import { Phone, Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ClientContact } from '@/lib/zod-schemas'

/**
 * "Tap-to-call", "tap-to-email", "tap-to-WhatsApp" buttons targeting the
 * primary (first) contact per §7.2. Buttons that have no destination are
 * hidden — never present a dead link.
 */
export function ContactActionButtons({ contacts }: { contacts: ClientContact[] }) {
  const primary = contacts[0]
  if (!primary) return null

  const phone = primary.phone?.replace(/\s+/g, '')
  const waPhone = phone?.replace(/[^\d+]/g, '').replace(/^\+/, '')

  return (
    <div className="flex flex-wrap items-center gap-2">
      {phone && (
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a href={`tel:${phone}`} aria-label={`Call ${primary.name}`}>
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        </Button>
      )}
      {primary.email && (
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a href={`mailto:${primary.email}`} aria-label={`Email ${primary.name}`}>
            <Mail className="h-3.5 w-3.5" />
            Email
          </a>
        </Button>
      )}
      {waPhone && (
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${primary.name}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </Button>
      )}
      <span className="text-xs text-muted-foreground">
        Primary: <span className="font-medium text-foreground">{primary.name}</span>
        {primary.role && <span className="text-muted-foreground"> · {primary.role}</span>}
      </span>
    </div>
  )
}
