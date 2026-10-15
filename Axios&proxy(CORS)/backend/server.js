import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.get('/api/jokes', (req, res) => {
    const jokes = [
        {
            id: 1,
            joke:"first joke",
            content :"joke is the best medicine"
        },
        {
            id: 2,
            joke:"second joke",
            content :"laughing is good for your health"
        },
        {
            id: 3,
            joke:"third joke",
            content :"a good sense of humor is priceless"
        },
        {
            id: 4,
            joke:"fourth joke",
            content :"laughter is contagious"
        },
        {
            id: 5,
            joke:"fifth joke",
            content :"a day without laughter is a day wasted"
        },
        {
            id: 6,
            joke:"sixth joke",
            content :"humor is the best medicine"
        }   
    ]
    res.json(jokes);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});