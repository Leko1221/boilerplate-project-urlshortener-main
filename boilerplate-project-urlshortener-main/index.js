require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient } = require('mongodb');
const dns = require('dns');
const urlparser = require('url');
const { error } = require('console');


const client = new MongoClient(process.env.MONGO_URI);
const db = client.db("urlshortner");
const urls = db.collection("urls");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/api/shorturl/:short_url', async function (req, res) {
  const shortUrl = parseInt(req.params.short_url);

  if (isNaN(shortUrl)) {
    return res.json({ error: 'Invalid short URL' });
  }

  try {
    const urlDoc = await urls.findOne({ short_url: shortUrl });

    if (urlDoc) {
      res.redirect(urlDoc.original_url);
    } else {
      res.json({ error: 'No short URL found for the given input' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Your first API endpoint
app.post('/api/shorturl', async function (req, res) {
  const originalUrl = req.body.url;

  // Validate and parse the hostname
  let hostname;
  try {
    hostname = urlparser.parse(originalUrl).hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(hostname, async (err, address) => {
    if (!address) {
      return res.json({ error: 'invalid url' });
    }

    const urlCount = await urls.countDocuments({});
    const urlDoc = {
      original_url: originalUrl,
      short_url: urlCount + 1,
    };

    await urls.insertOne(urlDoc);
    res.json({
      original_url: originalUrl,
      short_url: urlDoc.short_url,
    });
  });
});

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
