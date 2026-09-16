import express from 'express';
const app = express();

// Example route so you don't get a 404
app.get('/', (req, res) => {
  res.send('Hello from my Chamara Sahal app!');
});

// Export the app for Vercel (Do NOT use app.listen here)
export default app;