import type { DetectedIntent } from '../../utils/intentDetector'

interface Props {
  intent: DetectedIntent
  onConfirm: () => void
  onDeny: () => void
}

export default function IntentCard({ intent, onConfirm, onDeny }: Props) {
  return (
    <div
      className="mt-1.5 max-w-[400px] overflow-hidden rounded-2xl border-2"
      style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-[22px]">{intent.service.emoji}</span>
        <div>
          <div className="text-[14px] font-extrabold" style={{ color: 'var(--text-1)' }}>
            {intent.service.name}
          </div>
          {intent.subType && (
            <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              Sous-type detecte : {intent.subType}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
        <button
          onClick={onConfirm}
          className="flex-1 cursor-pointer rounded-xl border-none py-2 text-[12.5px] font-bold text-white transition-colors"
          style={{ background: 'var(--success)' }}
        >
          C'est bien ca
        </button>
        <button
          onClick={onDeny}
          className="flex-1 cursor-pointer rounded-xl border py-2 text-[12.5px] font-bold transition-colors"
          style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-2)' }}
        >
          Non, autre chose
        </button>
      </div>
    </div>
  )
}
