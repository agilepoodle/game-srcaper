const cheerio = require('cheerio');
const _ = require('lodash');
const got = require('got');
const moment = require('moment');

const espaUrl = 'https://www.palloliitto.fi/seura/169';
const hgUrl = 'https://www.palloliitto.fi/seura/99';
const baseUrl = 'https://palloliitto.fi';

const getGames = async () => {
    console.log('Fetching games and parsing...');
    const yj_re = /yj/i
    const espa = await got(espaUrl);
    const hg = await got(hgUrl);

    const espaGames = parseGamesFromHtmlBody(espa.body);
    const hgYjGames = _.filter(parseGamesFromHtmlBody(hg.body), g => {
        return g.homeTeam.match(yj_re) || g.awayTeam.match(yj_re);
    });

    const games =_.sortBy(
        _.concat(espaGames, hgYjGames)
    , 'timestamp');

    return {
        html: formatOutput(games),
        json: games
    };
};

const parseGamesFromHtmlBody = (body) => {
    const games = [];
    const $ = cheerio.load(body);

    $('.match-row').each( (i, row) => {
        const game = {};
        game.league = $(row).find('.category-column').text();
        game.homeTeam = $(row).find('.home-team-wrapper > .team-name').text();
        game.awayTeam = $(row).find('.visiting-team-wrapper > .team-name').text();
        game.matchTime = $(row).find('.match-time-wrapper').text().trim();
        game.timestamp = parseTimeToMoment(game.matchTime);
        game.link = baseUrl + $(row).find('.live-match-link > a').attr('href');
        games.push(game);
    });

    return games;
}

const parseTimeToMoment = (matchTime) => {
    const date_re = /(\d+)\.(\d+)\.\s+(\d+:\d+)/;
    const todays_game_re = /\.*klo\s+(\d+:\d+)/i;
    const tomorrows_game_re = /\.*huomenna\s+(\d+:\d+)/i;
    const currentMonth = moment().month();

    let gameYear, gameMonth, gameDay, gameTime;

    const dateMatch = matchTime.match(date_re);
    console.log('orig match time', matchTime);
    console.log('match', dateMatch);

    if(matchTime.match(/klo/i)) { // Game is today
        gameDay = moment().date();
        gameMonth = moment().month();
        gameTime = matchTime.match(todays_game_re)[1];
    } else if(matchTime.match(/huomenna/i)) { // Game is tomorrow
        gameDay = moment().add(1, 'days').date();
        gameMonth = dateMatch[2];
        gameTime = matchTime.match(tomorrows_game_re)[1];
    }else {
        gameDay = dateMatch[1] < 10 ? `0${dateMatch[1]}` : dateMatch[1];
        gameMonth = dateMatch[2] < 10 ? `0${dateMatch[2]}` : dateMatch[2];
        gameTime = dateMatch[3];
    }
    gameYear = gameMonth < currentMonth ? moment().add(1, 'year').year() : moment().year();
    return moment(`${gameYear}-${gameMonth}-${gameDay} ${gameTime}`);
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
    }).join('\n');

    return `<html lang="en">
    <head>
      <meta charset="utf-8">
      <title>EsPa Games</title>
      <meta name="description" content="EsPa Games">
      <meta name="author" content="EsPa/JMo">
    </head>
    <body>
        ${html}
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
           'x-custom-header' : 'x-espa-games-data',
           'Content-Type' : 'text/html'
        }
    };

    if(event.queryStringParameters && event.queryStringParameters.json) {
        console.log('JSON requested');
        response.body = JSON.stringify(games.json);
        response.headers['Content-Type'] = 'application/json';
    } else {
        response.body = games.html;
    }
    console.log("response: ", response);
    return response;    
};
