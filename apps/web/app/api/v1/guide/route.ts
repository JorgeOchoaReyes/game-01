import { AGENT_WORKFLOW, GAME_KIT_REFERENCE, GAME_PRACTICES } from "@polly/practices";

export async function GET() {
  return Response.json({ practices: GAME_PRACTICES, kitReference: GAME_KIT_REFERENCE, workflow: AGENT_WORKFLOW });
}
