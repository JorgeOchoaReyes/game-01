// Starts a new game in the studio from a starter (POST, so it never fires on prefetch).
export function RemixButton({ starter, label = "Remix in studio", primary = true }: { starter: string; label?: string; primary?: boolean }) {
  return (
    <form className="inline-form" method="post" action="/studio/new">
      <input type="hidden" name="starter" value={starter} />
      <button className={`btn small${primary ? " primary" : ""}`} type="submit">{label}</button>
    </form>
  );
}
