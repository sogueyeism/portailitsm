const SUGGESTIONS = [
  'Mon écran clignote',
  'Je n\'arrive plus à me connecter',
  'Mot de passe oublié',
  'Mon PC est très lent',
  'Créer un compte mail',
]

interface QuickSuggestionsProps {
  onSelect: (text: string) => void
}

export default function QuickSuggestions({ onSelect }: QuickSuggestionsProps) {
  return (
    <div className="mt-4 flex max-w-[640px] flex-wrap justify-center gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          className="qs-chip"
          onClick={() => onSelect(s)}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
