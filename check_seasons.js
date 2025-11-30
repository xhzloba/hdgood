const https = require('https');

const url = "https://api.bhcesh.me/franchise/details?token=eedefb541aeba871dcfc756e6b31c02e&kinopoisk_id=464963";

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json.seasons, null, 2));
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (err) => {
  console.error("Error: " + err.message);
});
