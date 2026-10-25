// Starts a new game in the studio from a starter, or as a copy of a public game
// (POST, so it never fires on prefetch).
export function RemixButton({ starter, remix, label = "Remix in studio", primary = true, big = false }: {
  starter?: string;
  remix?: string;
  label?: string;
  primary?: boolean;
  big?: boolean;
}) {
  return (
    <form className="inline-form" method="post" action="/studio/new">
      {starter && <input type="hidden" name="starter" value={starter} />}
      {remix && <input type="hidden" name="remix" value={remix} />}
      <button className={`btn${big ? " big" : " small"}${primary ? " primary" : ""}`} type="submit">{label}</button>
    </form>
  );
}
