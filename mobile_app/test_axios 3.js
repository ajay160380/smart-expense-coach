const axios = require('axios');
axios.get('https://ajay160380-paisa-mitra.hf.space/api/summary-stats/')
  .then(res => console.log(res.status))
  .catch(err => console.log(err.message));
