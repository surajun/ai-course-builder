# 🚀 AI Course Builder

> **Turn any topic into a structured video course in seconds using Generative AI.**

## 🧐 About the Project

The **AI Course Builder** addresses the problem of unstructured online learning. While platforms like YouTube have vast information, finding a structured learning path is difficult.

This full-stack application allows users to enter **any topic** (e.g., "Python for Beginners") and instantly receives a curated, 15-lesson course complete with:
- **Structured Syllabus:** AI-generated lesson titles and descriptions.
- **Curated Content:** Intelligent fetching of the best relevant YouTube videos.
- **Learning Aids:** Auto-generated quizzes and video summaries.

It bridges the gap between raw information and a classroom-like experience.

## ✨ Key Features

- **🤖 AI-Powered Curriculum:** Uses **Google Gemini AI** to generate comprehensive course structures on the fly.
- **📹 Intelligent Video Search:** A smart algorithm fetches the top 5 YouTube videos for each lesson and validates them to ensure they have captions/transcripts available.
- **📝 Automated Summaries:** Converts video transcripts into concise, easy-to-read textual summaries using GenAI.
- **✅ Dynamic Quizzes:** Generates a 10-question multiple-choice quiz for any lesson to test user knowledge.
- **🎙️ Voice Search:** Integrated Web Speech API allows users to search for courses using voice commands.
- **🌗 Dark Mode UI:** A polished, responsive interface built with Material-UI (MUI).

## 🛠️ Tech Stack

### **Frontend**
- **React.js:** Component-based UI architecture.
- **Material-UI (MUI):** For responsive design, theming, and pre-built components.
- **Axios:** For handling HTTP requests.

### **Backend**
- **Node.js & Express.js:** RESTful API architecture.
- **Google Gemini API:** For generative text (course plans, quizzes, summaries).
- **YouTube Data API:** For fetching video metadata.
- **YouTube-Transcript:** For extracting video captions for summarization.

---

## ⚙️ System Architecture

1.  **User Input:** Client sends a topic request to the backend.
2.  **AI Generation:** Backend prompts Gemini AI to create a JSON-structured course plan.
3.  **Data Enrichment:** Backend iterates through lessons and queries YouTube Data API for relevant videos.
4.  **Validation Loop:** The system checks multiple videos to find one with a valid transcript for the "Summarizer" feature.
5.  **Response:** The fully constructed course object is sent back to the client for rendering.

