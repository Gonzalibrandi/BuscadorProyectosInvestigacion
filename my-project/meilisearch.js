const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: 'http://meilisearch:7700',
  apiKey: 'MASTER_KEY'
});

module.exports = client;