const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const csvParser = require('csv-parser');
const PORT = process.env.PORT || 3000;
let scheduledShowAtLastChecking = 'Server initiated';
let numberOfFillersPlayed = 0;
let shouldAdvanceFillerIndex = true;

// Setting up EJS as the view engine
app.set('view engine', 'ejs');

// Serve the /vid directory as a static resource
app.use('/vid', express.static(path.join(__dirname, 'vid')));

// Serve the /vid directory as a static resource
app.use('/views', express.static(path.join(__dirname, 'views')));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));


//----------GET###################################


// Basic route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to render the Add Show form
app.get('/add-show', (req, res) => {
  res.render('add-show');
});

// Route to render the Player page
app.get('/player', (req, res) => {
  res.render('player');
});

app.get('/player-tv', (req, res) => {
  res.render('player-tv');
});

// Route to get the list of shows (for populating the dropdown)
app.get('/shows-list', (req, res) => {
  const showsDir = path.join(__dirname, 'shows');
  
  // Read all subdirectories inside /shows
  fs.readdir(showsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading shows directory' });
    }

    // Filter directories and format their names
    const shows = files.filter(file => fs.statSync(path.join(showsDir, file)).isDirectory())
                       .map(file => titleify(file));
    
    res.json(shows);  // Send the list of shows back to the client
  });
});

// Route to get show data
app.get('/get-show-data', (req, res) => {

  try {

    const showName = req.query.show;

    const showDir = path.join(__dirname, 'shows', showName);

    const type = fs.readFileSync(
      path.join(showDir, 'type.txt'),
      'utf-8'
    ).trim();

    let currentEpisodeName;

    if (showName === 'fillers') {

      currentEpisodeName = getCurrentFillerEpisode(showName);

    } else {

      currentEpisodeName = getLegacyCurrentEpisode(showName);
    }

    const filePath = `/vid/${showName}/${currentEpisodeName}`;

    res.json({
      type,
      filePath
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Failed to get show data'
    });
  }
});


// Route to advance to next episode
app.get('/next-episode', (req, res) => {

  try {

    const showName = req.query.show;

    let currentEpisodeName;

    if (showName === 'fillers') {

      currentEpisodeName = advanceFillerEpisode(showName);

    } else {

      currentEpisodeName = advanceLegacyEpisode(showName);
    }

    const filePath = `/vid/${showName}/${currentEpisodeName}`;

    res.json({
      filePath
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Failed to advance episode'
    });
  }
});


// Route to handle next episode logic
app.get('/next-episode', (req, res) => {
  const showName = req.query.show;
  const showDir = path.join(__dirname, 'shows', showName);

  // Read the current index
  let currentIndex = parseInt(fs.readFileSync(path.join(showDir, 'index.txt'), 'utf-8').trim(), 10);

  // Read the playlist file
  const playlist = fs.readFileSync(path.join(showDir, 'playlist.txt'), 'utf-8').split('\n').map(line => line.trim()).filter(Boolean);
  const playlistLength = playlist.length;

  // Check if we've reached the end of the playlist
  if (currentIndex >= playlistLength) {
    // Shuffle the playlist if we've reached the end
    const shuffledPlaylist = shufflelegacyarray(playlist);
    fs.writeFileSync(path.join(showDir, 'playlist.txt'), shuffledPlaylist.join('\n'));

    // Reset the index to 1
    currentIndex = 1;
    fs.writeFileSync(path.join(showDir, 'index.txt'), '1');
  } else {
    // Increment the index and save it
    currentIndex += 1;
    fs.writeFileSync(path.join(showDir, 'index.txt'), currentIndex.toString());
  }

  // Get the new current episode
  const currentEpisodeName = playlist[currentIndex - 1];
  const filePath = `/vid/${showName}/${currentEpisodeName}`;

  // Send the new file path to the client
  res.json({ filePath });
});


// Updated route to fetch the scheduled show name
app.get('/get-scheduled-show-name', async (req, res) => {
console.log('REQUEST', Date.now(), numberOfFillersPlayed);
  try {
	  
	const scheduledShowName = await getScheduledShowName(); 
	if(scheduledShowName === scheduledShowAtLastChecking || scheduledShowAtLastChecking === 'Server initiated'){  //same
		res.json({ scheduledShowName }); // Send normal
		scheduledShowAtLastChecking = scheduledShowName;  //📢
	}
	
	else if(scheduledShowName !== scheduledShowAtLastChecking && scheduledShowAtLastChecking !== 'Server initiated') {  // different
	  
		if(numberOfFillersPlayed === 0){  //how many: 0
					if(firstFillerShouldBePlayed()){  // should first be played
						res.json({ scheduledShowName: "fillers" })
						numberOfFillersPlayed = 1;      // set fillers:1
					}
					else {
						res.json({ scheduledShowName }); // Send normal	  
						scheduledShowAtLastChecking = scheduledShowName;  //📢
            if(shouldAdvanceFillerIndex === true)
              shouldAdvanceFillerIndex = false;
					}
		}
		
		else if(numberOfFillersPlayed === 1){  //how many: 1
					if(secondFillerShouldBePlayed()){  // should second be played
						console.log('checking whether second filler to be played')
						res.json({ scheduledShowName: "fillers" })
						console.log(numberOfFillersPlayed + 'fillers before')
						numberOfFillersPlayed = 2;	 // set fillers:2
						console.log(numberOfFillersPlayed + 'fillers after')
					}
					else{
						res.json({ scheduledShowName }); // Send normal	  
						scheduledShowAtLastChecking = scheduledShowName;  //📢
						numberOfFillersPlayed = 0;	 // set fillers:0
            if(shouldAdvanceFillerIndex === true)
              shouldAdvanceFillerIndex = false;
					}
		}
		
		else if(numberOfFillersPlayed === 2){  //how many: 2
					res.json({ scheduledShowName }); // Send normal
					scheduledShowAtLastChecking = scheduledShowName;  //📢	
					numberOfFillersPlayed = 0;	 // set fillers:0
					console.log('testing here')
          if(shouldAdvanceFillerIndex === true)
            shouldAdvanceFillerIndex = false;
		}
    }
 
  } 
  catch (error) {
    console.error("Error fetching scheduled show name:", error);
    res.status(500).json({ error: 'Failed to fetch scheduled show name' });
  }

});



//----------GET###################################










//----POST~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// POST route to handle form submission
app.post('/add-show', (req, res) => {
  const { showName, episodes, showType } = req.body;

  // Convert show name to lowercase, replace spaces with underscores
  const sanitizedShowName = showName.toLowerCase().replace(/\s+/g, '_');

  // Path to the new show's directory inside /shows
  const showDir = path.join(__dirname, 'shows', sanitizedShowName);

  // Check if /shows directory exists, if not, create it
  if (!fs.existsSync(showDir)) {
    fs.mkdirSync(showDir, { recursive: true });
  }

  // Write episodes to playlist.txt, after shuffling
  const episodesArray = episodes.split('\n').map(e => e.trim()).filter(Boolean);
  const shuffledEpisodes = shufflelegacyarray(episodesArray);
  const playlistPath = path.join(showDir, 'playlist.txt');
  fs.writeFileSync(playlistPath, shuffledEpisodes.join('\n'));

  // Write show type to type.txt
  const typePath = path.join(showDir, 'type.txt');
  fs.writeFileSync(typePath, showType);

  // Write initial index (1) to index.txt
  const indexPath = path.join(showDir, 'index.txt');
  fs.writeFileSync(indexPath, '1');

  // Redirect the user back to the /add-show page (or send a success message)
  res.redirect('/add-show');
});


//----POST~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~






//****************************************************************************
// Starting the server
app.listen(PORT, () => {
  console.log(`Server started and is running on http://localhost:${PORT}`);
});
//****************************************************************************



/////////functions=============

// Helper function to shuffle an array (we'll reuse this in the app)
function shufflelegacyarray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function shuffleArray(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

// Helper function to titleify a show name
function titleify(str) {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Utility function to get current time rounded down to the nearest half hour
function getCurrentTimeRoundedDown() {
  const now = new Date();

  // Get current hours and minutes
  let hours = now.getHours();
  let minutes = now.getMinutes();

  // Round down minutes to nearest half hour
  minutes = minutes < 30 ? '00' : '30';

  // Format hours and AM/PM
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM/PM
  const formattedTime = `${hours}:${minutes} ${ampm}`;

  console.log(`Current rounded time: ${formattedTime}`);
  return formattedTime;
}

// Function to get current day of the week
function getCurrentDayIndex() {
  const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  return dayOfWeek === 0 ? 7 : dayOfWeek; // Map Sunday to index 7
}

// Function to read CSV and get the show name based on the current time and day
function getScheduledShowName() {
  const filePath = path.join(__dirname, 'sch', 'schedule.csv');
  const currentTime = getCurrentTimeRoundedDown();
  const currentDayIndex = getCurrentDayIndex(); // Get day index for the column

  // Array to store the CSV data
  const rows = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        // Convert row object to array (values only, no headers)
        const rowArray = Object.values(row);
        rows.push(rowArray);
      })
      .on('end', () => {
        console.log('CSV file has been read successfully.');

        // Log the entire array for debugging
        //console.log('Parsed CSV Data:', JSON.stringify(rows));

        // Loop through rows to find the matching time
        for (const row of rows) {
          if (row[0] === currentTime) {
            const showName = row[currentDayIndex];
            console.log(`Show name found: ${showName}`);
            return resolve(showName);
          }
        }

        // If no matching time is found
        console.error('Error, current time couldn\'t be matched');
        return resolve("Error, current time couldn't be matched");
      })
      .on('error', (err) => {
        console.error('Error reading the CSV file:', err);
        return reject(err);
      });
  });
}

function firstFillerShouldBePlayed() {
  // 1–10
  const value = Math.floor(Math.random() * 10) + 1;

  console.log('first random:', value);

  // 80% chance -> 1 through 8
  //return value <= 8;
 return true;
}

function secondFillerShouldBePlayed() {
  // 1–10
  const value = Math.floor(Math.random() * 10) + 1;

  console.log('second random:', value);

  // 50% chance -> 1 through 5
  //return value <= 5;
  return true;
}



//////////////// Filler and legacy new functions

// =========================
// LEGACY SHOW FUNCTIONS
// =========================

function getLegacyCurrentEpisode(showName) {
  const showDir = path.join(__dirname, 'shows', showName);

  const currentIndex = parseInt(
    fs.readFileSync(path.join(showDir, 'index.txt'), 'utf-8').trim(),
    10
  );

  const playlist = fs.readFileSync(
    path.join(showDir, 'playlist.txt'),
    'utf-8'
  )
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return playlist[currentIndex - 1];
}


function advanceLegacyEpisode(showName) {
  const showDir = path.join(__dirname, 'shows', showName);

  let currentIndex = parseInt(
    fs.readFileSync(path.join(showDir, 'index.txt'), 'utf-8').trim(),
    10
  );

  let playlist = fs.readFileSync(
    path.join(showDir, 'playlist.txt'),
    'utf-8'
  )
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const playlistLength = playlist.length;

  if (currentIndex >= playlistLength) {

    // Shuffle and overwrite playlist
    playlist = shuffleArray(playlist);

    fs.writeFileSync(
      path.join(showDir, 'playlist.txt'),
      playlist.join('\n')
    );

    currentIndex = 1;

    fs.writeFileSync(
      path.join(showDir, 'index.txt'),
      '1'
    );

  } else {

    currentIndex += 1;

    fs.writeFileSync(
      path.join(showDir, 'index.txt'),
      currentIndex.toString()
    );
  }

  return playlist[currentIndex - 1];
}

// =========================
// FILLER FUNCTIONS
// =========================

//this function was butchered by chatgpt. That's why it's so bloated
function getCurrentFillerEpisode(showName) {

  const showDir = path.join(__dirname, 'shows', showName);

  const mode = isItDayOrNight();

  const indexFile =
    mode === 'day'
      ? 'dayindex.txt'
      : 'nightindex.txt';

  let currentIndex = parseInt(
    fs.readFileSync(path.join(showDir, indexFile), 'utf-8').trim(),
    10
  );

  let playlist = parseCSV(
    path.join(showDir, 'playlist.csv')
  );

  const playlistLength = playlist.length;

  let attempts = 0;

  if (currentIndex > playlistLength) {

      //self added bit
      playlist = shuffleArray(playlist);

      const csvText = playlist
        .map(row => row.join(','))
        .join('\n');

      fs.writeFileSync(
        path.join(showDir, 'playlist.csv'),
        csvText
      );
      //end of self added bit

      currentIndex = 1;
  }

  while (attempts < playlistLength) {

    const row = playlist[currentIndex - 1];

    //this if condition is clever but tricky
    if (
      row &&
      row.length >= 4 &&
      (mode === 'day' || row[3].toLowerCase() === 'n')
    ) {

      const chance = parseInt(row[4], 10) || 1;
      const roll = Math.floor(Math.random() * chance) + 1;

      console.log(
        `index ${currentIndex} rolled ${roll}/${chance} and ${roll === 1 ? 'passed' : 'failed'}`
      );

      if (roll === 1) {

        currentIndex += 1;
        fs.writeFileSync(
          path.join(showDir, indexFile),
          currentIndex.toString()
        );

        return row[2];
      }
    }

    currentIndex += 1;

    if (currentIndex > playlistLength) {

      //self added bit
      playlist = shuffleArray(playlist);

      const csvText = playlist
        .map(row => row.join(','))
        .join('\n');

      fs.writeFileSync(
        path.join(showDir, 'playlist.csv'),
        csvText
      );
      //end of self added bit

      currentIndex = 1;
    }

    attempts++;
  }

  throw new Error(
    `No ${mode} fillers available.`
  );
}

function advanceFillerEpisode(showName) {

  if(shouldAdvanceFillerIndex === false){
    shouldAdvanceFillerIndex = true;
    console.log('advance abort, before exit');
    return
  }


  const showDir = path.join(__dirname, 'shows', showName);

  const mode = isItDayOrNight(); // 'day' or 'night'

  const indexFile =
    mode === 'day'
      ? 'dayindex.txt'
      : 'nightindex.txt';

  let currentIndex = parseInt(
    fs.readFileSync(path.join(showDir, indexFile), 'utf-8').trim(),
    10
  );

  let playlist = parseCSV(
    path.join(showDir, 'playlist.csv')
  );

  const playlistLength = playlist.length;


// =========================
// DAYTIME LOGIC
// =========================

if (mode === 'day') {

  let attempts = 0;

  while (attempts < playlistLength) {

    if (currentIndex > playlistLength) { //this may require an equal sign. Try if any issue. Chatgpt put it there but it made many mistakes hence it's removal

      playlist = shuffleArray(playlist);

      const csvText = playlist
        .map(row => row.join(','))
        .join('\n');

      fs.writeFileSync(
        path.join(showDir, 'playlist.csv'),
        csvText
      );

      currentIndex = 1;

    }

    const row = playlist[currentIndex - 1];

    if (!row || row.length < 4) {
      throw new Error(`Invalid filler playlist row at index ${currentIndex}`);
    }

    const chance = parseInt(row[4], 10) || 1;
    const roll = Math.floor(Math.random() * chance) + 1;

    console.log(`index ${currentIndex} rolled ${roll}/${chance} and ${roll === 1 ? 'passed' : 'failed'}`);

    if (roll === 1) {
      
      currentIndex += 1;
      fs.writeFileSync(
        path.join(showDir, indexFile),
        currentIndex.toString()
      );
      console.log('Filler function sends this to the client side: ' + row[2])
      return row[2];
    }

    currentIndex += 1;
    attempts++;
  }

  throw new Error('No day fillers available.');
}

// =========================
// NIGHTTIME LOGIC
// =========================

let attempts = 0;

while (attempts < playlistLength) {

  if (currentIndex > playlistLength) {
    currentIndex = 1;
  }

  const row = playlist[currentIndex - 1];

  if (
    row &&
    row.length >= 4 &&
    row[3].toLowerCase() === 'n'
  ) {

    const chance = parseInt(row[4], 10) || 1;
    const roll = Math.floor(Math.random() * chance) + 1;

    console.log(`index ${currentIndex} rolled ${roll}/${chance} and ${roll === 1 ? 'passed' : 'failed'}`);

    if (roll === 1) {
      
      currentIndex += 1;
      fs.writeFileSync(
        path.join(showDir, indexFile),
        currentIndex.toString()
      );
      console.log('Filler function sends THE following link to the client side: ' + row[2])
      return row[2];
    }
  }

  attempts++;
  currentIndex += 1;
}

throw new Error('No night fillers available.');
}


















////////////////////// CSV utility //////////////////////////////////

// Very lightweight CSV parser.
// Assumes no escaped commas.
function parseCSV(filePath) {
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(',').map(v => v.trim()));
}













////////////// TIME UTILITY ////////////////////


function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
}

function isItDayOrNight() {
    // Load config
	const configPath = './config/daynight.json';
	const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const dayStarts = timeToMinutes(config.dayStarts);
    const nightStarts = timeToMinutes(config.nightStarts);

    // Current time
    const now = new Date();
    const currentMinutes = (now.getHours() * 60) + now.getMinutes();

    // Determine state
    if (currentMinutes >= dayStarts && currentMinutes < nightStarts) {
        console.log('☀️☀️☀️')
        return 'day';
    }
    console.log('🌙🌙🌙')
    return 'night';
}
