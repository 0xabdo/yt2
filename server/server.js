const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React build directory
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
} else {
  app.use(express.static('public'));
}

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, '..', 'downloads');
fs.ensureDirSync(downloadsDir);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'YouTube Downloader API is running' });
});

// Get video info
app.get('/api/video-info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(url);
    const videoDetails = {
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[0]?.url,
      duration: info.videoDetails.lengthSeconds,
      author: info.videoDetails.author.name,
      formats: ytdl.filterFormats(info.formats, 'videoandaudio')
    };

    res.json(videoDetails);
  } catch (error) {
    console.error('Error getting video info:', error);
    res.status(500).json({ error: 'Failed to get video information' });
  }
});

// Download video
app.get('/api/download', async (req, res) => {
  try {
    const { url, format = 'mp4' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const fileName = `${videoTitle}.${format}`;
    const filePath = path.join(downloadsDir, fileName);

    // Set headers for file download
    res.header('Content-Disposition', `attachment; filename="${fileName}"`);
    res.header('Content-Type', 'application/octet-stream');

    // Create download stream
    const stream = ytdl(url, {
      format: format === 'mp3' ? 'audioonly' : 'videoandaudio',
      quality: 'highest'
    });

    // Pipe the stream to response
    stream.pipe(res);

    // Handle errors
    stream.on('error', (error) => {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });

  } catch (error) {
    console.error('Error downloading video:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download video' });
    }
  }
});

// Get available formats
app.get('/api/formats', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(url);
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    
    const availableFormats = formats.map(format => ({
      itag: format.itag,
      quality: format.qualityLabel,
      container: format.container,
      hasVideo: format.hasVideo,
      hasAudio: format.hasAudio
    }));

    res.json(availableFormats);
  } catch (error) {
    console.error('Error getting formats:', error);
    res.status(500).json({ error: 'Failed to get video formats' });
  }
});

// Serve React app - catch all handler
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'client', 'build', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'React app not built. Please run "npm run build" first.',
      message: 'This endpoint requires the React app to be built before deployment.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
