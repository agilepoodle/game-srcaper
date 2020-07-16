const cheerio = require('cheerio');
const https = require('https');

console.log('Fetching games and parsing...');

const baseUrl = 'https://palloliitto.fi';

https.get('https://www.palloliitto.fi/seura/169', res => {
    let body = '';

    res.on('data', chunk => body += chunk);
    
    res.on('end', () => {
        const games = [];
        const $ = cheerio.load(body);
        $('.match-row').each( (i, row) => {
            const game = {};
            game.league = $(row).find('.category-column').text();
            game.homeTeam = $(row).find('.home-team-wrapper > .team-name').text();
            game.awayTeam = $(row).find('.visiting-team-wrapper > .team-name').text();
            game.matchTime = $(row).find('.match-time-wrapper').text().trim();
            game.link = baseUrl + $(row).find('.live-match-link > a').attr('href');
            games.push(game);
        });
        console.log(games);
    });
});
