const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const cors = require('cors');
require('dotenv').config();

const app = express();

// configure multer to store uploaded files in memory
const upload = multer({
    dest: 'uploads/',
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index', { error: null, output: null });
});

app.get('/generate', async (req, res) => {
    const { input } = req.query;
  
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [{
            role: "user", 
            content: input
        }],
        temperature: 0.7,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CHATGPT_API_KEY}`,
        },
      });
  
      const output = response.data.choices[0].message.content.trim();
      res.json({ input, output, error: null });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred.' });
    }
});

app.get('/creative-writing-prompt', async (req, res) => {
    const { topic, mood } = req.query;

    var input = "Give me a random creative writing prompt in json format with the parameters {title, prompt, topic, mood}";
    if (topic) { input += " with a topic of " + topic }
    if (mood) { input += " with a mood of " + mood }
    
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [{
            role: "user", 
            content: input
        }],
        temperature: 0.7,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CHATGPT_API_KEY}`,
        },
      });
  
      const output = response.data.choices[0].message.content.trim();
      const output_parts = JSON.parse(output);
      res.json({ input, prompt: output_parts.prompt, title: output_parts.title, mood: output_parts.mood, topic: output_parts.topic, error: null });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred.' });
    }
});

// endpoint to OCR an image and output the text in JSON
app.post('/screenshot', upload.single('image'), async (req, res) => {
    try {
      // load the image data from the request
      const imageBuffer = req.file.buffer;
  
      const worker = await createWorker();
      console.log(worker);

      // initialize the Tesseract.js worker
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
  
      // perform OCR on the image
      const { data } = await worker.recognize(imageBuffer);
  
      // return the text in a JSON response
      res.json({ text: data.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}.`);
});