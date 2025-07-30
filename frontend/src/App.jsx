import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// MUI Imports
import { 
  Button, Card, CardContent, CardActions, CircularProgress, Container, TextField, Typography,
  ThemeProvider, createTheme, CssBaseline, Grow, Skeleton, IconButton
} from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import SummarizeIcon from '@mui/icons-material/Summarize';
import MicIcon from '@mui/icons-material/Mic';

// MUI Colors & Theme
import { deepPurple, green } from '@mui/material/colors';
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: deepPurple,
    secondary: green,
  },
});

const LessonCardSkeleton = () => (
  <Card variant="outlined" sx={{ mb: 2 }}>
    <CardContent>
      <Skeleton variant="text" width="80%" height={40} />
      <Skeleton variant="text" width="95%" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="rectangular" sx={{ mt: 2, borderRadius: 1 }} height={250} />
    </CardContent>
    <CardActions>
      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }}/>
      <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }}/>
    </CardActions>
  </Card>
);

function App() {
  const [topic, setTopic] = useState('');
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  
  const [isListening, setIsListening] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      console.error("Speech recognition not supported by this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => setTopic(event.results[0][0].transcript);
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
    }
  }, []);

  const handleVoiceSearch = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCourse(null);
    setPage(1);
    setError('');
    setSummary('');
    setSummaryError('');
    setQuiz(null);
    try {
      const response = await axios.post(`http://localhost:4000/api/get-course`, { topic, page: 1 });
      setCourse(response.data);
      setHasMore(response.data.hasMore);
    } catch (err) {
      setError('Failed to generate course. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const response = await axios.post(`http://localhost:4000/api/get-course`, { topic, page: nextPage });
      setCourse(prevCourse => ({
        ...prevCourse,
        lessons: [...prevCourse.lessons, ...response.data.lessons]
      }));
      setPage(nextPage);
      setHasMore(response.data.hasMore);
    } catch (err) {
      console.error("Failed to fetch more lessons", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleGenerateQuiz = async (lesson) => {
    setLoadingQuiz(true);
    setSelectedLesson(lesson);
    setQuiz(null);
    try {
      const response = await axios.get(`http://localhost:4000/api/generate-quiz?topic=${lesson.title}`);
      setQuiz(response.data.quiz);
    } catch (err) {
      console.error("Failed to generate quiz", err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSummarizeVideo = async (videoId) => {
    if (!videoId) return;
    setLoadingSummary(true);
    setSummary('');
    setSummaryError('');
    try {
      const response = await axios.post(`http://localhost:4000/api/summarize-video`, { videoId });
      setSummary(response.data.summary);
    } catch (err) {
      setSummaryError(err.response?.data?.error || "An unknown error occurred.");
      console.error("Failed to generate summary", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <header className="App-header">
          <Typography variant="h2" component="h1" gutterBottom>AI Course Builder</Typography>
          <Typography variant="h6" color="text.secondary">Enter a topic or use voice search to create a course!</Typography>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', margin: '32px 0' }}>
          <TextField label="Course Topic" variant="outlined" value={topic} onChange={(e) => setTopic(e.target.value)} required color="secondary" focused style={{ width: '400px' }}/>
          <IconButton onClick={handleVoiceSearch} color={isListening ? 'error' : 'secondary'} sx={{ border: '1px solid', borderRadius: '8px' }}>
            <MicIcon />
          </IconButton>
          <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ height: '56px' }}>
            {loading ? <CircularProgress size={24} /> : 'Generate Course'}
          </Button>
        </form>

        <div className="main-content">
          <div className="left-column">
            {error && <Typography color="error">{error}</Typography>}
            <div className="course-container">
              {loading ? (
                <><LessonCardSkeleton /><LessonCardSkeleton /><LessonCardSkeleton /></>
              ) : (
                course && course.lessons.map((lesson, index) => (
                  <Grow key={lesson.title + index} in={true} style={{ transformOrigin: '0 0 0' }} timeout={500 + index * 100}>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h5" component="div">{index + 1}. {lesson.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>{lesson.description}</Typography>
                        {lesson.video_id ? (
                          <div className="video-container">
                            <iframe src={`https://www.youtube.com/embed/${lesson.video_id}`} title={lesson.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                          </div>
                        ) : (
                          <Typography color="error" sx={{ mt: 2 }}>No video found for this lesson.</Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button size="small" startIcon={<QuizIcon />} onClick={() => handleGenerateQuiz(lesson)} disabled={loadingQuiz && selectedLesson?.title === lesson.title} sx={{ textTransform: 'none', padding: '2px 10px' }}>
                          {loadingQuiz && selectedLesson?.title === lesson.title ? 'Generating...' : 'Quiz'}
                        </Button>
                        <Button size="small" startIcon={<SummarizeIcon />} onClick={() => handleSummarizeVideo(lesson.video_id)} disabled={!lesson.video_id} sx={{ textTransform: 'none', padding: '2px 10px' }}>
                          Summary
                        </Button>
                      </CardActions>
                      {selectedLesson?.title === lesson.title && quiz && (
                        <CardContent className="quiz-container">
                          <Typography variant="h6">Quiz: {lesson.title}</Typography>
                          {quiz.map((q, qIndex) => (
                            <div key={qIndex} className="quiz-question">
                              <Typography variant="subtitle1" sx={{ mt: 1 }}><strong>{qIndex + 1}. {q.question}</strong></Typography>
                              <ul>{q.options.map((option, oIndex) => <li key={oIndex}><Typography variant="body2">{option}</Typography></li>)}</ul>
                              <Typography variant="caption" color="secondary"><em>Correct Answer: {q.correctAnswer}</em></Typography>
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  </Grow>
                ))
              )}
            </div>
            {course && hasMore && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <Button variant="contained" onClick={handleShowMore} disabled={loadingMore}>
                  {loadingMore ? <CircularProgress size={24} /> : 'Show More'}
                </Button>
              </div>
            )}
          </div>
          <div className="right-column">
            <Card variant="outlined" sx={{ position: 'sticky', top: '2rem' }}>
              <CardContent>
                <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SummarizeIcon /> Video Summary
                </Typography>
                <div style={{ marginTop: '1rem', minHeight: '300px' }}>
                  {loadingSummary && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '2rem' }}><CircularProgress /></div>}
                  {summaryError && <Typography color="error">{summaryError}</Typography>}
                  {summary && <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>{summary}</Typography>}
                  {!loadingSummary && !summary && !summaryError && (
                    <Typography variant="body2" color="text.secondary">Click "Summary" on any lesson to see a detailed summary here.</Typography>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </ThemeProvider>
  );
}

export default App;