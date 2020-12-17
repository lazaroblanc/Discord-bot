const fs = require('fs');
const https = require('https');

// Takes in seconds and outputs a string like '23 Std. 50 Min. 10 Sek.'
module.exports.formatSeconds = seconds => {
    let totalseconds = parseInt(seconds, 10); // don't forget the second param (base 10)
    let days = Math.floor(totalseconds / 86400);
    let hours = Math.floor((totalseconds - (days * 86400)) / 3600);
    let minutes = Math.floor((totalseconds - (days * 86400) - (hours * 3600)) / 60);
    let _seconds = Math.floor((totalseconds - (days * 86400) - (hours * 3600) - (minutes * 60)));

    let output = [];
    days > 0 && output.push(`${days} Tage`);
    hours > 0 && output.push(`${hours} Std.`);
    days < 1 && seconds >= 60 && output.push(`${minutes} Min.`);
    minutes < 1 && output.push(`${_seconds} Sek.`);
    return output.join(' ');
};

module.exports.asyncHttpsDownloadToFile = async (url, destination) => {
    return new Promise(resolve => {
        let file = fs.createWriteStream(destination);
        https.get(url, response => {
            response.pipe(file);
            file.on('close', resolve);
        });
    });
};