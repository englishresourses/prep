# FluentPrep — English Placement Practice Web App

A 100% client-side, zero-backend voice practice web application designed for students preparing for campus placement English assessments and interviews.

## 🚀 Key Features

- **Module 1: Listening Comprehension (30 Sets)**: First-person narrative passages read with SpeechSynthesis (TTS). The app automatically prompts questions and activates the microphone for spoken answers, evaluated with our JSON-driven rubric engine.
- **Module 2: Situational Dialog (30 Role-Play Scenarios)**: Interactive turn-by-turn conversations simulating campus placements, job interviews, customer service, and daily campus life. Includes visual word-by-word diffs (**green** for matched words, **red** for missing/unspoken words).
- **JSON-Driven Rubrics**: Scoring parameters, max marks, band descriptors, thresholds, and feedback tips are 100% configured via JSON (`src/data/rubrics/listening.json` and `src/data/rubrics/dialogs.json`).
- **Resilient Web Speech Engine**: Prioritizes Indian English (`en-IN`) with fallbacks to `en-US`/`en-GB`. Includes 0.8x / 1.0x / 1.2x playback speed controls, passage replay caps (max 2 replays), live interim transcripts, and keyboard typing fallback.
- **Student Dashboard & Analytics**: Tracks calendar practice streak, average accuracy, completion metrics, and lists sets needing improvement (< 75%). All stored safely in browser `localStorage` with `try/catch` error protection.
- **Mobile-First & Accessible**: Dark/light mode toggle, large touch targets (≥ 48px), and zero external backend or paid APIs.

---

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Routing**: React Router DOM (SPA client routing)
- **Styling**: Vanilla CSS design system with CSS custom properties, glassmorphism, and responsive layout
- **Icons**: Lucide React
- **Unit Testing**: Vitest (17 passing unit tests for normalization and the rubric engine)

---

## 💻 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Start local development server
npm run dev

# 4. Open in Chrome or Edge
# http://localhost:5173/
```

---

## 📁 How to Add or Modify Content

### 1. Adding a Listening Comprehension Set
Open `src/data/listening.json` and append a new JSON object adhering to this schema:

```json
{
  "id": "L31",
  "title": "Topic or Scenario Title",
  "passage": "Your name is [Character Name]. [Write a 4-5 sentence first-person narrative].",
  "questions": [
    {
      "q": "What specific item did you purchase?",
      "modelAnswer": "I purchased two tickets for the train.",
      "keywords": [
        ["ticket", "tickets"],
        ["train", "railway"]
      ]
    }
  ]
}
```
> **Keyword Group Rule**: `keywords` is a 2D array (`[[alt1, alt2], [altA, altB]]`). A group is satisfied if **ANY** alternative keyword or phrase in that group is spoken.

### 2. Adding a Situational Dialog Set
Open `src/data/dialogs.json` and append a new scenario:

```json
{
  "id": "D31",
  "title": "Interviewing for a Software Internship",
  "situation": "You are at a placement interview answering questions about your technical background and projects.",
  "turns": [
    {
      "n": 1,
      "prompt": "Could you briefly introduce your recent project?",
      "response": "I built a web application using React that helps students prepare for English placements.",
      "keywords": ["built", "web", "application", "react", "students", "prepare"]
    }
  ]
}
```

### 3. Modifying Evaluation Rubrics
Each module's evaluation criteria lives in its own JSON file:
- `src/data/rubrics/listening.json`
- `src/data/rubrics/dialogs.json`

Rubric validation rules (enforced on startup and in Vitest):
1. Parameter `max` values must add up to `totalMarks`.
2. Every `checker` named in a parameter must exist in `src/utils/checkers/`.
3. The `bands` array for each parameter must be sorted by `marks` descending.

---

## 🌐 Static Deployment Guide (Vercel / Netlify)

Because the Web Speech API (specifically `SpeechRecognition`) requires a secure context, this app **must be served over HTTPS** in production.

### Deploy to Vercel
1. Run `npm run build` to verify the production bundle.
2. Push your repository to GitHub / GitLab.
3. Import the repository into [Vercel](https://vercel.com).
4. Vercel automatically detects Vite:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Enable SPA rewrite by adding a `vercel.json` if needed:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Deploy to Netlify
1. Drag and drop the `dist/` folder into Netlify Drop, or connect your Git repo.
2. Set build command to `npm run build` and publish directory to `dist`.
3. Add a `_redirects` file in `public/_redirects`:
   ```text
   /*    /index.html   200
   ```

---

## 📱 Manual Testing Checklist (Desktop & Mobile)

Speech APIs cannot be fully automated in headless environments. Use this checklist to test on **Google Chrome / Microsoft Edge on Desktop** and **Chrome on Android**:

### 1. Diagnostics & Permissions (`/speech-test`)
- [ ] Open `/speech-test` in Chrome or Edge.
- [ ] Click **Start Microphone**. Verify the browser prompt asks for microphone permission.
- [ ] Speak "Hello world, testing speech recognition". Verify that the live transcript appears and the confidence score displays.
- [ ] Click **Play Test Passage Voice**. Verify that audio speaks clearly. Test speed toggles (0.8x, 1.0x, 1.2x).

### 2. Module 1: Listening Comprehension (`/listening/L1`)
- [ ] Open Set L1 (Local Grocery Store).
- [ ] Click **Play Passage**. Verify the first-person passage is read aloud.
- [ ] Verify the replay counter decrements (e.g., `1 replay(s) remaining`).
- [ ] Click **I'm Ready — Start Spoken Questions**.
- [ ] Verify Question 1 is read aloud ("What day of the week do you shop for groceries?").
- [ ] Verify the microphone activates automatically after the question finishes reading.
- [ ] Answer with concise speech: say **"Wednesday"**.
- [ ] Click **Evaluate Answer**.
- [ ] Verify that the Rubric Breakdown appears showing **10 / 10 pts** (Exemplary Comprehension, Accurate Syntax, Fluent Delivery, Crisp Pronunciation).
- [ ] Click **Next Question**.
- [ ] Test the **Keyboard Fallback**: Click "Microphone having issues? Type answer instead", type an answer, and submit.
- [ ] Complete all 4 questions. Verify the final summary screen displays total score out of 40, accuracy percentage, and detailed rubric feedback.

### 3. Module 2: Situational Dialog (`/dialogs/D1`)
- [ ] Open Dialog D1 (Checking into a Hotel).
- [ ] Review the scenario briefing card. Notice the target response is hidden in **Placement Mode**.
- [ ] Click **Start Turn-by-Turn Role-Play**.
- [ ] **Turn 1 (Fast & Accurate Answer)**:
  - App speaks: *"Good afternoon! How can I assist you today?"*
  - Answer within 1.5 seconds: *"Good afternoon, I would like to check in under my name for a three-day stay."*
  - Click **Evaluate Turn**:
  - Verify **10 / 10 pts** (Pragmatic 3.0/3.0, Syntax 2.5/2.5, Fluency 2.5/2.5 Exemplary < 1.5s, Pronunciation 2.0/2.0).
  - Verify word diff: all words highlight in **green**.
- [ ] **Turn 2 (Wrong-Pronoun / Syntax Slip Test)**:
  - App speaks: *"May I confirm the room type you reserved?"*
  - Target: *"I reserved a single room that includes complimentary breakfast."*
  - Answer with **"we"** instead of **"I"**: *"We reserved a single room that includes complimentary breakfast."*
  - Click **Evaluate Turn**:
  - Verify **Syntactic Precision** drops by 0.5 (to 2.0/2.5 Competent) with the feedback tip: *"Check small words: articles (a/the), I vs we, and prepositions."*
- [ ] **Turn 3 (Slow Answer / Latency Test)**:
  - App speaks: *"Here is your keycard for room 402. Is there anything else you require?"*
  - Target: *"Could you please share the Wi-Fi password so I can connect my work laptop?"*
  - Wait 4 seconds before speaking your answer.
  - Click **Evaluate Turn**:
  - Verify **Fluency & Latency** assigns 0.5 / 2.5 (Deficient tier > 3.0s delay) with tip: *"Start within two seconds and finish the whole sentence."*
- [ ] **Turn 4 (Hint Used Test)**:
  - Click **"Show Hint"** to display the target sentence.
  - Speak: *"Thank you very much for your kind help."*
  - Verify the turn is tagged with a yellow **"Hint Used"** badge in feedback and review.
- [ ] **End Screen (Aggregation = Mean)**:
  - Verify overall score is calculated as the **mean of all turns out of 10** (e.g. 7.9 / 10).
  - Verify the **Mean Performance by Rubric Dimension** cards display average scores for all 4 parameters.
  - Verify the **Turns Needing Polish** section lists any turn scoring under 75%.

### 4. Progress Dashboard & Offline Persistence (`/dashboard`)
- [ ] Navigate to `/dashboard`.
- [ ] Verify the **Practice Streak** counter displays your active streak.
- [ ] Verify that completed listening and dialog sessions appear in the **Recent Practice History** table with dates and percentage scores.
- [ ] Refresh the page in your browser. Verify all scores, metrics, and streaks persist intact from `localStorage`.
- [ ] Toggle Dark/Light mode in the top right navbar. Verify the theme preference persists across refreshes.
