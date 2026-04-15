import ServiceCard from './ServiceCard'
import { useCatalogueStore } from '../../store/catalogueStore'

interface ServiceCatalogueProps {
  onOpenModal: (id: string) => void
  onAccessDenied: () => void
}

export default function ServiceCatalogue({ onOpenModal, onAccessDenied }: ServiceCatalogueProps) {
  const services = useCatalogueStore((s) => s.services)
  const activeServices = services.filter((s) => s.active)

  return (
    <div
      className="w-full"
      style={{ padding: '20px 32px 40px', maxWidth: 800, margin: '0 auto' }}
    >
      <div
        className="mb-3.5 text-[11px] font-bold uppercase tracking-[.7px]"
        style={{ color: 'var(--text-3)' }}
      >
        Services disponibles
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
      >
        {activeServices.map((svc, i) => (
          <ServiceCard
            key={svc.id}
            service={svc}
            index={i}
            onOpen={onOpenModal}
            onAccessDenied={onAccessDenied}
          />
        ))}
      </div>
    </div>
  )
}
