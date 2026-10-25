import { AGENT_WORKFLOW, GAME_KIT_REFERENCE, GAME_PRACTICES } from "@polly/practices";

// Kept under 8,000 characters as JSON (Frankie's default tool-result limit).
export async function GET() {
  return Response.json({ workflow: AGENT_WORKFLOW, rules: GAME_PRACTICES, kitApi: GAME_KIT_REFERENCE });
}
