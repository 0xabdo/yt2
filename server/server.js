const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Suppress ytdl update check
process.env.YTDL_NO_UPDATE = 'true';

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

// Function to read and parse cookies.txt in the new ytdl-core format
// According to ytdl-core docs: https://github.com/distubejs/ytdl-core#cookies-support
function getCookies() {
  try {
    const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
    if (!fs.existsSync(cookiesPath)) {
      console.log('cookies.txt not found, proceeding without cookies');
      return [];
    }
    
    const cookiesContent = fs.readFileSync(cookiesPath, 'utf8');
    const cookieLines = cookiesContent.split('\n').filter(line => 
      line.trim() && !line.startsWith('#') && line.includes('\t')
    );
    
    // Parse cookies in the exact format ytdl-core expects: { name, value, domain, path }
    const cookies = cookieLines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 7) {
        return {
          name: parts[5],
          value: parts[6],
          domain: parts[0],
          path: parts[2]
        };
      }
      return null;
    }).filter(cookie => cookie !== null);
    
    console.log(`Cookies loaded successfully: ${cookies.length} cookies found`);
    
    // Debug: Log first few cookies to verify format
    if (cookies.length > 0) {
      console.log('Sample cookies:', JSON.stringify(cookies.slice(0, 3), null, 2));
      console.log('Cookie string format:', cookies.map(c => `${c.name}=${c.value}`).join('; '));
      console.log('Total cookies loaded:', cookies.length);
      
      // Additional debugging for cookie parsing
      console.log('First cookie line from file:', cookieLines[0]);
      console.log('Cookie parts:', cookieLines[0]?.split('\t'));
    }
    
    return cookies;
  } catch (error) {
    console.error('Error reading cookies.txt:', error);
    return [];
  }
}

// Function to validate cookie format
function validateCookies(cookies) {
  if (cookies.length === 0) return false;
  
  const requiredProps = ['name', 'value', 'domain', 'path'];
  const isValid = cookies.every(cookie => 
    requiredProps.every(prop => cookie.hasOwnProperty(prop) && cookie[prop])
  );
  
  console.log('Cookie validation:', isValid ? 'PASSED' : 'FAILED');
  if (!isValid) {
    console.log('Invalid cookies found:', cookies.filter(cookie => 
      !requiredProps.every(prop => cookie.hasOwnProperty(prop) && cookie[prop])
    ));
  }
  
  return isValid;
}

// Get cookies once at startup
const cookies = getCookies();
validateCookies(cookies);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'YouTube Downloader API is running' });
});

// Test cookies endpoint
app.get('/api/test-cookies', (req, res) => {
  res.json({ 
    cookiesLoaded: cookies.length,
    sampleCookies: cookies.slice(0, 3),
    cookieString: cookies.map(c => `${c.name}=${c.value}`).join('; ')
  });
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

    const options = cookies.length > 0 ? { 
      requestOptions: { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
        } 
      } 
    } : {};
    console.log('Video info options:', JSON.stringify(options, null, 2));
    console.log('Cookies being used:', JSON.stringify(cookies.slice(0, 3), null, 2));
    console.log('Attempting to get video info with cookies...');
    const info = await ytdl.getInfo(url, options);
    
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

    const options = cookies.length > 0 ? { 
      requestOptions: { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
        } 
      } 
    } : {};
    const info = await ytdl.getInfo(url, options);
    
    const videoTitle = info.videoDetails.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const fileName = `${videoTitle}.${format}`;
    const filePath = path.join(downloadsDir, fileName);

    // Set headers for file download
    res.header('Content-Disposition', `attachment; filename="${fileName}"`);
    res.header('Content-Type', 'application/octet-stream');

    // Create download stream with cookies
    const stream = ytdl(url, {
      format: format === 'mp3' ? 'audioonly' : 'videoandaudio',
      quality: 'highest',
      requestOptions: cookies.length > 0 ? { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
        } 
      } : {}
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

    const options = cookies.length > 0 ? { 
      requestOptions: { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
        } 
      } 
    } : {};
    const info = await ytdl.getInfo(url, options);
    
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
  
  // Show appropriate URL based on environment
  if (process.env.NODE_ENV === 'production') {
    console.log(`API available at https://youtube-installer-1.onrender.com/api`);
    console.log(`App available at https://youtube-installer-1.onrender.com`);
  } else {
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`App available at http://localhost:${PORT}`);
  }
});
