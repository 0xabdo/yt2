# YouTube Video Downloader

A modern web application built with React.js and Node.js that allows users to download YouTube videos directly to their computer. The application features a beautiful, responsive UI and supports both MP4 video and MP3 audio downloads.

## Features

- 🎥 Download YouTube videos in MP4 format
- 🎵 Download audio-only in MP3 format
- 📱 Responsive design that works on all devices
- 🎨 Modern, beautiful UI with smooth animations
- ⚡ Fast and efficient downloads using @distube/ytdl-core
- 📊 Video information preview before download
- 🔒 Secure and reliable downloads

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)

## Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd youtube-downloader
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

## Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   npm run dev
   ```
   This will start the Node.js server on port 5000 with auto-reload enabled.

2. **Start the React frontend** (in a new terminal)
   ```bash
   npm run client
   ```
   This will start the React development server on port 3000.

3. **Open your browser**
   Navigate to `http://localhost:3000` to use the application.

### Production Mode

1. **Build the React app**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

3. **Open your browser**
   Navigate to `http://localhost:5000` to use the application.

## How to Use

1. **Enter a YouTube URL**
   - Paste any valid YouTube video URL in the input field
   - Supported formats: `https://www.youtube.com/watch?v=VIDEO_ID`

2. **Choose Format**
   - Select MP4 for video download
   - Select MP3 for audio-only download

3. **Get Video Info**
   - Click "Get Video Info" to preview the video details
   - This will show the title, author, duration, and thumbnail

4. **Download**
   - Click "Download MP4" or "Download MP3" to start the download
   - The file will be saved to your computer's default download folder

## API Endpoints

The backend provides the following API endpoints:

- `GET /api/health` - Health check endpoint
- `GET /api/video-info?url=<youtube_url>` - Get video information
- `GET /api/download?url=<youtube_url>&format=<mp4|mp3>` - Download video/audio
- `GET /api/formats?url=<youtube_url>` - Get available video formats

## Project Structure

```
youtube-downloader/
├── server.js              # Main Node.js server file
├── package.json           # Backend dependencies
├── client/                # React frontend
│   ├── public/           # Static files
│   ├── src/              # React source code
│   │   ├── App.js        # Main React component
│   │   ├── index.js      # React entry point
│   │   └── index.css     # Main styles
│   └── package.json      # Frontend dependencies
└── downloads/            # Downloaded files (created automatically)
```

## Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **@distube/ytdl-core** - YouTube video downloader
- **CORS** - Cross-origin resource sharing
- **fs-extra** - File system utilities

### Frontend
- **React.js** - UI library
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **CSS3** - Styling with modern features

## Important Notes

⚠️ **Legal Disclaimer**: This application is for educational purposes only. Please respect YouTube's Terms of Service and copyright laws. Only download videos that you have permission to download.

⚠️ **Usage Limitations**: 
- Some videos may be restricted and cannot be downloaded
- Download speed depends on your internet connection and video size
- Large videos may take longer to download

## Troubleshooting

### Common Issues

1. **"Invalid YouTube URL" error**
   - Make sure the URL is a valid YouTube video URL
   - Check that the video is not private or restricted

2. **Download fails**
   - Check your internet connection
   - Try a different video
   - Some videos may be protected against downloading

3. **Server won't start**
   - Make sure port 5000 is not in use
   - Check that all dependencies are installed
   - Verify Node.js version is 14 or higher

### Error Messages

- **"YouTube URL is required"** - Enter a valid YouTube URL
- **"Invalid YouTube URL"** - The URL format is incorrect
- **"Failed to get video information"** - Video may be private or restricted
- **"Download failed"** - Network issue or video protection

## Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please:
1. Check the troubleshooting section above
2. Review the error messages carefully
3. Ensure you're using the latest version of the application

---

**Enjoy downloading your favorite YouTube videos!** 🎉
