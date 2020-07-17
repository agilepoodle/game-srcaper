zip -r espa-games.zip .
aws lambda update-function-code --publish --region eu-north-1 --function-name espaGames --zip-file fileb://./espa-games.zip