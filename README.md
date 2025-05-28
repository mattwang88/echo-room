# Echo Room
An AI-simulated meeting room to practice workplace communication and drive continuous learning
EchoRoom is an agent-powered platform designed to help users improve their communication skills and identify key learning needs though
realistic workplace meeting simulations
. Here's the breakdown of its capabilities:1.
Scenario Selection:
Users start by choosing a meeting scenario from a list (e.g., "New Product Pitch," "Quarterly OKR Review"). Each scenario has a specific title, description, and objective.2.
Simulated Meeting Environment:
Once a scenario is selected, the user enters a virtual meeting interface.
This interface features a chat-like display where the simulation unfolds.
The system presents an initial message setting the stage for the meeting.3.
AI Agent Interaction:
The user interacts with AI agents who play different roles (like CTO, Head of Finance, Head of Product, HR).
These AI agents are programmed with distinct personas. When the user provides a proposal or response:
The agents react from their role's perspective.
They express an initial feeling (e.g., "From a tech perspective, I'm intrigued...").
They provide brief comments or observations.
They ask 1-2 targeted follow-up questions to clarify or explore aspects relevant to their role.
7.
Feedback Summary Report:
Once a meeting ends, the user is taken to a summary page.
This report includes:
The scenario title and objective.
An average semantic score from the user's responses during the session.
A detailed breakdown of coaching feedback and evaluation for each of the user's messages, presented in an accordion format for easy review.8.
Technical Foundation:
The app is built with Next.js (App Router), React, and uses ShadCN UI components with Tailwind CSS for styling.
Genkit is used for all AI functionalities, powering the agent simulations, real-time coaching, and semantic evaluation.
It has a clean, professional look with a light gray background, blue primary color, and green accent color.

