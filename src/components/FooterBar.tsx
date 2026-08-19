type Prompt = { key: string; label: string; onClick?: () => void };

type Props = { prompts: Prompt[] };

export function FooterBar({ prompts }: Props) {
  return (
    <footer className="footer">
      <div className="prompts">
        {prompts.map((p) => (
          <button key={p.key} className="prompt" type="button" onClick={p.onClick}>
            <span className="prompt-key">{p.key}</span>
            <span className="prompt-label">{p.label}</span>
          </button>
        ))}
      </div>
    </footer>
  );
}
