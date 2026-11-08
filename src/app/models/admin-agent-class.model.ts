export interface AgentClassAgent {
  id: string;
  agentName: string;
  agentCode?: string | null;
  contactNumber: string;
  email: string;
  isActive: boolean;
}

export interface AdminAgentClass {
  id: string;
  className: string;
  commSharePercentage: number;
  isActive: boolean;
  agentCount: number;
  agents: AgentClassAgent[];
}

export interface AgentClassRequest {
  className: string;
  commSharePercentage: number;
}
