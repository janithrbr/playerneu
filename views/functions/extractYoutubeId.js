// Helper function to build a YouTube embed URL from a video URL string
function extractYoutubeId(url) {
  console.log('EXTRACTOR:trying to extract yt id from ' + url)
  const videoId = url.match(/[?&]v=([^&#]*)/)?.[1];
  if (!videoId) return null;
 
  let embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&cc_load_policy=1`;
 
  const start = url.match(/[?&](?:start|t)=([^&#]*)/)?.[1];
  const end = url.match(/[?&]end=([^&#]*)/)?.[1];
  if (start) embedUrl += `&start=${start}`;
  if (end) embedUrl += `&end=${end}`;

  console.log('EXTRACTOR: extracted url is '+ embedUrl)
 
  return embedUrl;
}
