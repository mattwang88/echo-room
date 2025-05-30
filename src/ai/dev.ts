
import { config } from 'dotenv';
config();

import '@/ai/flows/semantic-skill-evaluation.ts';
import '@/ai/flows/real-time-coaching.ts';
// import '@/ai/flows/simulate-ai-agents.ts'; // Simulates all agents at once, replaced by single agent for now
import '@/ai/flows/simulate-single-agent-response.ts';
import '@/ai/flows/generate-speech-audio-flow.ts';
import '@/ai/flows/generate-notebooklm-debrief-flow.ts';
