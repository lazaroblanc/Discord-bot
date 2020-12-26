const fs = require("fs");
const path = require("path");
const webp = require("webp-converter");
const https = require("https");
const canvas = require("canvas");

// Takes in seconds and outputs a string like "23 Std. 50 Min. 10 Sek."
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
    return output.join(" ");
};

module.exports.asyncHttpsDownloadToFile = async (url, destination) => {
    console.log("Download of " + destination + " started");

    let file = fs.createWriteStream(destination);
    https.get(url, response => {
        response.pipe(file);
    });

    return new Promise(resolve => {
        file.on("close", () => {
            console.log("Download of " + destination + " finished");
            resolve(destination);
        });
    });
};

module.exports.logChannelMembersToConsole = members => {
    members.each(member => {
        console.log("- " + member.displayName + " (" + member.id + ")");
    });
};

module.exports.downloadParticipantsAvatars = participants => {
    let avatarDownloadPromises = new Array();

    participants.forEach(participant => {
        let avatarUrl = participant.user.displayAvatarURL();
        let avatarFilename = path.basename(avatarUrl);
        let avatarDownloadPromise = module.exports.asyncHttpsDownloadToFile(avatarUrl, avatarFilename);
        avatarDownloadPromises.push(avatarDownloadPromise);
    });

    return avatarDownloadPromises;
};

module.exports.convertParticipantsWebpAvatarsToPng = avatarFilenames => {
    let avatarConversionPromises = new Array();

    avatarFilenames.forEach(avatarFilename => {
        let avatarFilenamePng = avatarFilename.replace("\.webp", ".png");
        let avatarConversionPromise = webp.dwebp(avatarFilename, avatarFilenamePng, "-o");
        avatarConversionPromises.push(avatarConversionPromise);
    });

    return avatarConversionPromises;
};

module.exports.convertWebpAvatarFilenamesToPng = avatarFilenames => {
    for (let i = 0; i < avatarFilenames.length; i++) {
        avatarFilenames[i] = avatarFilenames[i].replace("\.webp", ".png");
    }
    return avatarFilenames;
};

module.exports.createCarousellImage = async (participants, avatarFilenames, carousellOutputFile) => {
    const height = 32;
    const avatarPadding = 5;
    const width = participants.size * (height + avatarPadding) - avatarPadding;

    const image = canvas.createCanvas(width, height);
    const context = image.getContext("2d");

    let i = 0;
    await participants.forEach(async participant => {
        let avatarUrl = participant.user.displayAvatarURL();
        let avatarFilename = path.basename(avatarUrl);
        let avatarFilenamePng = avatarFilename.replace("\.webp", ".png");
        let avatarImage = await canvas.loadImage(
            path.join(__dirname, "..", avatarFilenames[avatarFilenames.indexOf(avatarFilenamePng)])
        );

        context.save();
        context.beginPath();
        context.arc(i + height / 2, height / 2, height / 2, 0, 2 * Math.PI)
        context.closePath();
        context.clip();
        console.log("Drawing avatar for " + participant.displayName + " to carousell image");
        context.drawImage(avatarImage, i, 0, height, height);
        context.restore();
        i += height + avatarPadding;
    });

    console.log("Writing carousell image to disk");
    const buffer = image.toBuffer("image/png")
    fs.writeFileSync(carousellOutputFile, buffer);
};

module.exports.cleanupCarousselTempfiles = (avatarsToConvert, avatarFilenames, carousellOutputFile) => {
    avatarsToConvert.forEach(file => {
        fs.unlinkSync(path.join(__dirname, "..", file));
    });
    avatarFilenames.forEach(file => {
        fs.unlinkSync(path.join(__dirname, "..", file));
    });
    fs.unlinkSync(carousellOutputFile);
};
