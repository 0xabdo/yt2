import express from 'express';
import cors from 'cors';
import { Innertube } from 'youtubei.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize YouTube client
let youtube;

// Initialize Innertube with proper session
const initializeInnertube = async () => {
  try {
    youtube = await Innertube.create();
    console.log('✅ Innertube initialized successfully');
    
    // Load cookies from file and set them
    const cookies = getCookiesFromFile();
    if (cookies.length > 0) {
      try {
        await youtube.setCookie(cookies);
        console.log(`🍪 Loaded and set ${cookies.length} cookies from cookies.txt`);
      } catch (error) {
        console.log('⚠️  Could not set cookies from file:', error.message);
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize Innertube:', error.message);
    youtube = null;
    
    // Retry after 5 seconds
    console.log('🔄 Retrying initialization in 5 seconds...');
    setTimeout(initializeInnertube, 5000);
  }
};

// Initialize on startup
initializeInnertube();

// Middleware
app.use(cors());
app.use(express.json());

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, '..', 'downloads');
fs.ensureDirSync(downloadsDir);

// Serve static files from the React build directory
// Try multiple possible paths for different deployment scenarios
const possibleBuildPaths = [
  path.join(__dirname, '..', 'client', 'build'),           // Local development
  path.join(__dirname, '..', '..', 'client', 'build'),     // Render deployment
  path.join(__dirname, 'client', 'build'),                 // Alternative structure
  path.join(process.cwd(), 'client', 'build')              // Current working directory
];

let clientBuildPath = null;
for (const buildPath of possibleBuildPaths) {
  if (fs.existsSync(buildPath)) {
    clientBuildPath = buildPath;
    console.log(`✅ Found React build at: ${buildPath}`);
    break;
  }
}

if (clientBuildPath) {
  app.use(express.static(clientBuildPath));
  console.log(`📁 Serving static files from: ${clientBuildPath}`);
} else {
  console.log('⚠️  React build directory not found. Available paths checked:');
  possibleBuildPaths.forEach(path => console.log(`   - ${path}`));
  app.use(express.static('public'));
}

// Read cookies from cookies.txt file and convert to proper format
const getCookiesFromFile = () => {
  try {
    const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
    if (fs.existsSync(cookiesPath)) {
      const cookiesContent = fs.readFileSync(cookiesPath, 'utf8');
      const cookies = [];
      
      cookiesContent.split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const parts = line.split('\t');
          if (parts.length >= 7) {
            const cookie = {
              domain: parts[0],
              hostOnly: parts[1] === 'TRUE',
              path: parts[2],
              secure: parts[3] === 'TRUE',
              expirationDate: parseInt(parts[4]) || Math.floor(Date.now() / 1000) + 86400, // Default 24h
              name: parts[5],
              value: parts[6],
              httpOnly: false, // Default value
              sameSite: 'no_restriction', // Default value
              session: false // Default value
            };
            cookies.push(cookie);
          }
        }
      });
      
      console.log(`🍪 Loaded ${cookies.length} cookies from cookies.txt`);
      return cookies;
    }
  } catch (error) {
    console.log('⚠️  Could not read cookies.txt:', error.message);
  }
  return [];
};



// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'YouTube Downloader API is running',
    innertube: youtube ? 'Ready' : 'Initializing...',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to debug Innertube
app.get('/api/test', async (req, res) => {
  try {
    if (!youtube) {
      return res.status(503).json({ error: 'YouTube service is not ready' });
    }
    
    // Test with a known working video
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    console.log('🧪 Testing with URL:', testUrl);
    
    const info = await youtube.getBasicInfo(testUrl);
    console.log('✅ Test successful:', {
      title: info.title,
      duration: info.duration,
      formats: info.formats?.length || 0
    });
    
    res.json({
      success: true,
      testUrl,
      videoInfo: {
        title: info.title,
        duration: info.duration,
        formats: info.formats?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      name: error.name,
      info: error.info || {}
    });
  }
});

// Get video info
app.get('/api/video-info', async (req, res) => {
  try {
    const { url, cookies = '' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Check if Innertube is initialized
    if (!youtube) {
      return res.status(503).json({ error: 'YouTube service is not ready. Please try again in a moment.' });
    }

    // Set cookies if provided
    if (cookies) {
      try {
        // If cookies is a string, try to parse it as JSON
        let cookieData = cookies;
        if (typeof cookies === 'string') {
          try {
            cookieData = JSON.parse(cookies);
          } catch (e) {
            console.log('⚠️  Could not parse cookies JSON string');
          }
        }
        
        if (Array.isArray(cookieData)) {
          await youtube.setCookie(cookieData);
          console.log('🍪 Cookies set for Innertube');
        } else {
          console.log('⚠️  Cookies must be an array');
        }
      } catch (error) {
        console.log('⚠️  Could not set cookies:', error.message);
      }
    }
    
    // Use Innertube method to get video info
    const info = await youtube.getBasicInfo(url);
    
    const videoDetails = {
      title: info.title,
      thumbnail: info.thumbnails?.[0]?.url || info.thumbnail?.url,
      duration: info.duration,
      author: info.channel?.name || info.author?.name,
      formats: info.formats || []
    };

    res.json(videoDetails);
  } catch (error) {
    console.error('Error getting video info:', error);
    
    // Handle specific YouTube errors
    if (error.message && error.message.includes('Sign in to confirm you\'re not a bot')) {
      return res.status(429).json({ 
        error: 'YouTube bot detection triggered',
        message: 'YouTube is requesting bot verification. Try adding cookies from your browser.',
        solution: 'Copy cookies from your browser when logged into YouTube and pass them as a parameter.',
        code: 'BOT_DETECTION',
        help: 'Use: ?url=YOUR_URL&cookies=YOUR_COOKIES_JSON_ARRAY or update cookies.txt file'
      });
    }
    
    if (error.message && error.message.includes('UnrecoverableError')) {
      return res.status(429).json({ 
        error: 'YouTube access blocked',
        message: 'YouTube has temporarily blocked access to this video.',
        solution: 'Try adding cookies from your browser or try again later.',
        code: 'ACCESS_BLOCKED'
      });
    }
    
    if (error.message && error.message.includes('Video unavailable')) {
      return res.status(400).json({ 
        error: 'Video unavailable',
        message: 'This video cannot be accessed. It may be private, restricted, or removed.',
        solution: 'Try a different video URL or check if the video is publicly available.',
        code: 'VIDEO_UNAVAILABLE',
        details: error.info || {}
      });
    }
    
    // Log the full error for debugging
    console.error('Full error details:', {
      message: error.message,
      name: error.name,
      info: error.info,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to get video information',
      message: error.message,
      code: error.name || 'UNKNOWN_ERROR'
    });
  }
});

// Download video
app.get('/api/download', async (req, res) => {
  try {
    const { url, format = 'mp4', cookies = '' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Check if Innertube is initialized
    if (!youtube) {
      return res.status(503).json({ error: 'YouTube service is not ready. Please try again in a moment.' });
    }

    // Set cookies if provided
    if (cookies) {
      try {
        // If cookies is a string, try to parse it as JSON
        let cookieData = cookies;
        if (typeof cookies === 'string') {
          try {
            cookieData = JSON.parse(cookies);
          } catch (e) {
            console.log('⚠️  Could not parse cookies JSON string');
          }
        }
        
        if (Array.isArray(cookieData)) {
          await youtube.setCookie(cookieData);
          console.log('🍪 Cookies set for Innertube');
        } else {
          console.log('⚠️  Cookies must be an array');
        }
      } catch (error) {
        console.log('⚠️  Could not set cookies:', error.message);
      }
    }
    
    // Use Innertube method to get video info
    const info = await youtube.getBasicInfo(url);
    
    const videoTitle = info.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const fileName = `${videoTitle}.${format}`;
    const filePath = path.join(downloadsDir, fileName);

    // Set headers for file download
    res.header('Content-Disposition', `attachment; filename="${fileName}"`);
    res.header('Content-Type', 'application/octet-stream');

    // Create download stream with Innertube
    const stream = await youtube.download(url, {
      format: format === 'mp3' ? 'audio' : 'video',
      quality: 'best'
    });

    // Pipe the stream to response
    stream.pipe(res);

    // Handle errors
    stream.on('error', (error) => {
      console.error('Download error:', error);
      if (!res.headersSent) {
        if (error.message && error.message.includes('Sign in to confirm you\'re not a bot')) {
          res.status(429).json({ 
            error: 'YouTube bot detection triggered',
            message: 'YouTube is requesting bot verification. Try adding cookies from your browser.',
            solution: 'Copy cookies from your browser when logged into YouTube and pass them as a parameter.',
            code: 'BOT_DETECTION'
          });
        } else {
          res.status(500).json({ error: 'Download failed' });
        }
      }
    });

  } catch (error) {
    console.error('Error downloading video:', error);
    if (!res.headersSent) {
      if (error.message && error.message.includes('Sign in to confirm you\'re not a bot')) {
        res.status(429).json({ 
          error: 'YouTube bot detection triggered',
          message: 'YouTube is requesting bot verification. Try adding cookies from your browser.',
          solution: 'Copy cookies from your browser when logged into YouTube and pass them as a parameter.',
          code: 'BOT_DETECTION'
        });
      } else {
        res.status(500).json({ error: 'Failed to download video' });
      }
    }
  }
});

// Get available formats
app.get('/api/formats', async (req, res) => {
  try {
    const { url, cookies = '' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Check if Innertube is initialized
    if (!youtube) {
      return res.status(503).json({ error: 'YouTube service is not ready. Please try again in a moment.' });
    }

    // Set cookies if provided
    if (cookies) {
      try {
        // If cookies is a string, try to parse it as JSON
        let cookieData = cookies;
        if (typeof cookies === 'string') {
          try {
            cookieData = JSON.parse(cookies);
          } catch (e) {
            console.log('⚠️  Could not parse cookies JSON string');
          }
        }
        
        if (Array.isArray(cookieData)) {
          await youtube.setCookie(cookieData);
          console.log('🍪 Cookies set for Innertube');
        } else {
          console.log('⚠️  Cookies must be an array');
        }
      } catch (error) {
        console.log('⚠️  Could not set cookies:', error.message);
      }
    }
    
    // Use Innertube method to get video info
    const info = await youtube.getBasicInfo(url);
    
    const availableFormats = info.formats?.map(format => ({
      itag: format.itag || format.id,
      quality: format.quality || format.qualityLabel,
      container: format.container || format.mimeType?.split('/')[1],
      hasVideo: format.hasVideo !== false,
      hasAudio: format.hasAudio !== false
    })) || [];

    res.json(availableFormats);
  } catch (error) {
    console.error('Error getting formats:', error);
    
    if (error.message && error.message.includes('Sign in to confirm you\'re not a bot')) {
      return res.status(429).json({ 
        error: 'YouTube bot detection triggered',
        message: 'YouTube is requesting bot verification. Try adding cookies from your browser.',
        solution: 'Copy cookies from your browser when logged into YouTube and pass them as a parameter.',
        code: 'BOT_DETECTION'
      });
    }
    
    res.status(500).json({ error: 'Failed to get video formats' });
  }
});

// Serve React app - catch all handler
app.get('*', (req, res) => {
  // Try to find the index.html file in the build directory
  let indexPath = null;
  
  if (clientBuildPath) {
    indexPath = path.join(clientBuildPath, 'index.html');
  } else {
    // Fallback to original path if build path wasn't found
    indexPath = path.join(__dirname, '..', 'client', 'build', 'index.html');
  }
  
  if (fs.existsSync(indexPath)) {
    console.log(`📄 Serving React app from: ${indexPath}`);
    res.sendFile(indexPath);
  } else {
    console.log(`❌ React app not found at: ${indexPath}`);
    console.log('🔍 Available paths checked:');
    possibleBuildPaths.forEach(path => console.log(`   - ${path}`));
    
    res.status(404).json({ 
      error: 'React app not built or not found',
      message: 'This endpoint requires the React app to be built before deployment.',
      checkedPaths: possibleBuildPaths,
      currentWorkingDir: process.cwd(),
      serverDir: __dirname
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
