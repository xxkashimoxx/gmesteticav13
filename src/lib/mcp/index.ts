import { defineMcp } from "@lovable.dev/mcp-js";
import listProceduresTool from "./tools/list-procedures";
import listUpcomingAppointmentsTool from "./tools/list-upcoming-appointments";
import listLeadsTool from "./tools/list-leads";
import createLeadTool from "./tools/create-lead";

export default defineMcp({
  name: "gm-estetica-mcp",
  title: "GM Estética Avançada",
  version: "0.1.0",
  instructions:
    "Ferramentas da clínica GM Estética Avançada: consulta de procedimentos, agenda de atendimentos, CRM de leads e criação de novos leads. Use list_procedures para catálogo, list_upcoming_appointments para agenda futura, list_leads para o funil e create_lead para registrar novos contatos.",
  tools: [listProceduresTool, listUpcomingAppointmentsTool, listLeadsTool, createLeadTool],
});
