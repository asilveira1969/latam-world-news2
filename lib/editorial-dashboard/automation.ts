export const EDITORIAL_AUTOMATION_DISABLED_MESSAGE = "Automatización editorial desactivada.";

export function isEditorialAutomationEnabled(value = process.env.EDITORIAL_AUTOMATION_ENABLED): boolean {
  return value === "true";
}
