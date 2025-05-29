
import type { Scenario } from './types';

export const scenarios: Scenario[] = [
  {
    id: 'product-pitch',
    title: 'New Product Pitch',
    description: 'Present your innovative product idea to the executive team and gain their buy-in.',
    objective: 'Convince the CTO, Head of Product, and Head of Finance to approve initial funding and resources for your new product idea. Address their concerns effectively.',
    initialMessage: {
      participant: 'System',
      text: "Welcome to the Product Pitch meeting. You're here to present your new product idea. The CTO, Head of Product, and Head of Finance are present. Please begin your pitch.",
    },
    agentsInvolved: ['CTO', 'Product', 'Finance'],
    personaConfig: {
      ctoPersona: "You are the Chief Technology Officer. You are interested in the technical feasibility, scalability, integration with existing systems, and the engineering resources required. Ask tough questions about the tech stack and potential risks.",
      financePersona: "You are the Head of Finance. Your main concerns are the budget, ROI, market size, revenue projections, and overall financial viability. Question the assumptions behind the financial model.",
      productPersona: "You are the Head of Product. You focus on market fit, user value, competitive landscape, product roadmap, and how this aligns with the company's strategic product vision. Inquire about user research and differentiation.",
      hrPersona: "You are the Head of HR. You consider the team structure, talent requirements, and potential impact on company culture or existing teams. (Not actively participating in this scenario by default but persona is defined).",
    },
    maxTurns: 10,
  },
  {
    id: 'okr-review',
    title: 'Quarterly OKR Review',
    description: 'Discuss your team\'s progress on Key Results for the past quarter and plan for the next.',
    objective: 'Successfully justify your team\'s performance on OKRs, explain any deviations, and propose realistic and ambitious OKRs for the next quarter. Get alignment from the Head of Product and HR.',
    initialMessage: {
      participant: 'System',
      text: "This is the Quarterly OKR Review. The Head of Product and Head of HR are here to discuss your team's progress. Please provide an update on your key results.",
    },
    agentsInvolved: ['Product', 'HR'],
    personaConfig: {
      ctoPersona: "You are the CTO. (Not actively participating in this scenario by default but persona is defined).",
      financePersona: "You are the Head of Finance. (Not actively participating in this scenario by default but persona is defined).",
      productPersona: "You are the Head of Product. You want to see clear progress on strategic goals, understand any blockers, and ensure the next quarter's OKRs are impactful and well-defined.",
      hrPersona: "You are the Head of HR. You are interested in team capacity, morale, skill development related to OKRs, and any hiring needs or performance management aspects arising from the OKR review.",
    },
    maxTurns: 8,
  },
  {
    id: 'manager-1on1',
    title: '1-on-1 with Direct Manager',
    description: 'Discuss your performance, challenges, and career growth with your direct manager.',
    objective: 'Have a constructive conversation about your recent performance, address any challenges you are facing, and discuss your career development goals with your manager.',
    initialMessage: {
      participant: 'Product', // Product role will act as the Manager
      text: "Hi there. Thanks for making time for our 1-on-1. To start, how have things been going for you lately? What's on your mind?",
    },
    agentsInvolved: ['Product'], // Only 'Product' agent is involved, acting as the manager
    personaConfig: {
      ctoPersona: "You are the CTO. You are not participating in this 1-on-1 meeting.",
      financePersona: "You are the Head of Finance. You are not participating in this 1-on-1 meeting.",
      productPersona: "You are the user's Direct Manager (simulated as Head of Product). This is a 1-on-1 meeting. Your primary role is to listen actively to the user's updates, challenges, and aspirations. Respond empathetically and supportively. Provide brief, constructive feedback and ask 1-2 targeted follow-up questions to understand their perspective better or to explore solutions and growth opportunities. Your responses should be concise, typically a couple of sentences leading to a question, fostering a focused dialogue.",
      hrPersona: "You are the Head of HR. You are not participating in this 1-on-1 meeting.",
    },
    maxTurns: 10,
  }
];

export const getScenarioById = (id: string): Scenario | undefined => {
  return scenarios.find(s => s.id === id);
};
