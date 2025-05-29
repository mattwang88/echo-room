
import { config } from 'dotenv';
config();

import '@/ai/flows/semantic-skill-evaluation.ts';
import '@/ai/flows/real-time-coaching.ts';
import '@/ai/flows/simulate-ai-agents.ts';
import '@/ai/flows/simulate-single-agent-response.ts'; // Added new flow
import '@/ai/flows/generate-speech-audio-flow.ts'; // Added new flow for Google Cloud TTS
