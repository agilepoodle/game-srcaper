const cheerio = require('cheerio');
const _ = require('lodash');
const got = require('got');

const baseUrl = 'https://palloliitto.fi';

const getGames = async () => {
    console.log('Fetching games and parsing...');
    const response = await got('https://www.palloliitto.fi/seura/169');
    const games = [];
    const $ = cheerio.load(response.body);
    $('.match-row').each( (i, row) => {
        const game = {};
        game.league = $(row).find('.category-column').text();
        game.homeTeam = $(row).find('.home-team-wrapper > .team-name').text();
        game.awayTeam = $(row).find('.visiting-team-wrapper > .team-name').text();
        game.matchTime = $(row).find('.match-time-wrapper').text().trim();
        game.link = baseUrl + $(row).find('.live-match-link > a').attr('href');
        games.push(game);
    });
    return {
        html: formatOutput(games),
        json: games
    };
};


const formatOutput = (data) => {
    const html = _.map(data, g => {
        return `
          <ul>
            <li>Sarja: ${g.league}</li>
            <li>${g.homeTeam} - ${g.awayTeam}</li>
            <li>${g.matchTime}</li>
            <li><a href="${g.link}">Ottelun tiedot</a></li>
          </ul>
        `;
    });

    return `<html lang="en">
    <head>
      <meta charset="utf-8">
      <title>EsPa Games</title>
      <meta name="description" content="EsPa Games">
      <meta name="author" content="EsPa/JMo">
      <link rel="stylesheet" href="css/styles.css?v=1.0">
    </head>
    <body>
        <ul>
          <li>${html}</li>
        </ul>
    </body>
    </html>`;

};


const exec = async () => {
    const gs = await getGames();
    console.log(gs);
};

exec();

exports.handler = async (event) => {
    const games = await getGames();
    let response = {
        statusCode: 200,
        headers: {
           "x-custom-header" : "x-espa-games-data"
        }
    };

    if(event.queryStringParameters && event.queryStringParameters.json) {
        response.body = JSON.stringify(games);
    } else {
        response.body = formatOutput(games);
    }
    console.log("response: ", response);
    return response;    
};
