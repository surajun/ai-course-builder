const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { YoutubeTranscript } = require('youtube-transcript');
require('dotenv').config();

const app = express();
const PORT = 4000;

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// In-memory cache to store the last generated full course plan
let courseCache = {};

app.use(cors());
app.use(express.json());

app.post('/api/get-course', async (req, res) => {
    const { topic, page = 1 } = req.body;
    const pageSize = 5;
    console.log(`Received request for topic: ${topic}, page: ${page}`);

    if (!topic) {
        return res.status(400).json({ error: 'A topic is required.' });
    }

    try {
        if (page === 1) {
            console.log("1. Sending topic to AI for a new course plan...");
            const prompt = `You are an expert course creator. A user wants to learn about "${topic}". Create a detailed 15-lesson course plan. Respond ONLY with a valid JSON object in the following format, where "Youtube_query" is a concise and effective search term for finding a relevant educational video on that specific lesson topic: 
            {
              "lessons": [
                {
                  "title": "Lesson 1 Title",
                  "description": "A one-sentence description of the first lesson.",
                  "Youtube_query": "search query for lesson 1"
                }
              ]
            }`;

            const result = await aiModel.generateContent(prompt);
            const responseText = result.response.text();
            const startIndex = responseText.indexOf('{');
            const endIndex = responseText.lastIndexOf('}') + 1;
            const jsonString = responseText.slice(startIndex, endIndex);
            const fullCoursePlan = JSON.parse(jsonString);
            
            courseCache[topic] = fullCoursePlan.lessons;
            console.log("2. AI generated and cached a full course plan.");
        }

        if (!courseCache[topic]) {
            return res.status(404).json({ error: 'Course not found. Please generate a new course first.' });
        }
        
        const allLessons = courseCache[topic];
        const paginatedLessons = allLessons.slice((page - 1) * pageSize, page * pageSize);
        const hasMore = (page * pageSize) < allLessons.length;

        console.log(`3. Fetching YouTube videos for page ${page}...`);
        const lessonsWithVideos = await Promise.all(paginatedLessons.map(async (lesson) => {
             const youtubeResponse = await youtube.search.list({
                part: 'snippet',
                q: lesson.Youtube_query,
                type: 'video',
                maxResults: 1,
                videoEmbeddable: 'true',
            });
            
            console.log(`YouTube API response for "${lesson.Youtube_query}":`, youtubeResponse.data.items);
            
            const videoId = youtubeResponse.data.items[0]?.id.videoId;
            return { ...lesson, video_id: videoId || null };
        }));

        console.log("4. Finished fetching videos.");
        res.json({ lessons: lessonsWithVideos, hasMore });

    } catch (error) {
        console.error('Error in /api/get-course:', error);
        res.status(500).json({ error: 'Failed to generate the course.' });
    }
});

app.get('/api/generate-quiz', async (req, res) => {
    const topic = req.query.topic;
    console.log(`Received quiz request for topic: ${topic}`);

    if (!topic) {
        return res.status(400).json({ error: 'A topic is required for the quiz.' });
    }

    try {
        const prompt = `You are a helpful AI that creates quizzes. Generate a 10-question multiple-choice quiz about "${topic}". Provide 4 options for each question. Respond ONLY with a valid JSON object in the following format:
        {
          "quiz": [
            {
              "question": "The first question text?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctAnswer": "The correct option text"
            }
          ]
        }`;

        // --- DEBUGGING LOGS ---
        console.log("--> Sending prompt to AI for quiz...");
        const result = await aiModel.generateContent(prompt);
        console.log("<-- Received response from AI for quiz.");
        // --- END DEBUGGING LOGS ---

        const responseText = await result.response.text();
        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}') + 1;
        const jsonString = responseText.slice(startIndex, endIndex);
        res.json(JSON.parse(jsonString));
    } catch (error) {
        console.error('Error generating quiz:', error);
        res.status(500).json({ error: 'Failed to generate the quiz.' });
    }
});

app.post('/api/summarize-video', async (req, res) => {
  const { videoId } = req.body;
  console.log(`Received summary request for videoId: ${videoId}`);

  if (!videoId) {
    return res.status(400).json({ error: 'A videoId is required.' });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      throw new Error("Transcript not available for this video.");
    }
    const transcriptText = transcript.map(item => item.text).join(' ');
    const prompt = `Please provide a detailed, well-structured summary of the following video transcript. Focus on the key concepts, explanations, and main points. Use paragraphs for clarity. Transcript: "${transcriptText.substring(0, 8000)}"`;
    const result = await aiModel.generateContent(prompt);
    const summary = await result.response.text();
    res.json({ summary });
  } catch (error) {
    console.error("--- ORIGINAL TRANSCRIPT ERROR ---", error);
    console.error('Error generating summary:', error.message);
    const userMessage = error.message.includes("Transcript not available") || error.message.includes("Transcript is disabled")
      ? "Sorry, a transcript is not available for this video, so it cannot be summarized."
      : "Failed to generate the video summary.";
    res.status(500).json({ error: userMessage });
  }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});