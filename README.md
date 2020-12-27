<div align="center">

<h1>Discord bot (working title)</h1>
<span>A Discord bot made using <a href="https://github.com/discordjs/discord.js">discord.js</a></span><br /><br />

<a href="./package.json"><img src="https://img.shields.io/github/package-json/v/lazaroblanc/discord-bot?style=flat"></a>
<a href="https://github.com/lazaroblanc/discord-bot/issues?q=is%3Aopen+is%3Aissue"><img alt="GitHub issues" src="https://img.shields.io/github/issues-raw/lazaroblanc/discord-bot?style=flat"></a>
<a href="https://github.com/lazaroblanc/discord-bot/issues?q=is%3Aissue+is%3Aclosed"><img alt="GitHub issues" src="https://img.shields.io/github/issues-closed/lazaroblanc/discord-bot?style=flat"></a>
<a href="https://github.com/lazaroblanc/discord-bot/commits/master"><img src="https://img.shields.io/github/commit-activity/m/lazaroblanc/discord-bot?style=flat"></a>
<a href="https://david-dm.org/lazaroblanc/discord-bot"><img src="https://img.shields.io/david/lazaroblanc/discord-bot?style=flat"></a>
<a href="https://sonarcloud.io/dashboard?id=lazaroblanc_discord-bot"><img alt="Sonar Quality Gate" src="https://img.shields.io/sonar/alert_status/lazaroblanc_discord-bot?logo=sonarcloud&server=https%3A%2F%2Fsonarcloud.io&style=flat"></a>

</div>

<hr>

<div align="center">
<table>
<tr>
<td colspan=2>
<h2>🐛 Bug reports & Feature requests 🆕</h2>
If you've found a bug or want to request a new feature please <a href="https://github.com/lazaroblanc/discord-bot/issues/new">open a new <b>Issue</b></a>
<br><br>
</td>
</tr>
<tr>
<td>
<h2>🤝 Contributing</h2>
✅ Pull requests are welcome!
<br><br>
</td>
<td>
<h2>📃 License</h2>
Please see the <a href="./LICENSE.md"><b>License</b></a> for details
<br><br>
</td>
</tr>
</table>
</div>


## Features

##### 1. Talk ended embeds

It posts a message whenever a conversation in a voice channel ended <a href="https://i.imgur.com/THj9Ar6.png">similar to <b>Microsoft Teams</b></a>.
<br>The message contains the participants usernames and avatars as well as the duration of the chat.

<img height="128px" src="https://i.imgur.com/XDvpxx7.png">

##### 2. Rotating status/playing messages

## To-Dos & planned features

- Transfer this To-Do list to a **GitHub Project-** or  **Trello**-board
- Start writing Documentation (it's planned to use GitHub's Wiki feature for this)
- Set up automated deployment to server via GitHub Actions if possible
- More config options:
  - minimum length for talk ended embeds to be sent
  - interval for rotating status message
  - behaviour for rotating status message:
    - random
    - alphabetical asc.
    - alphabetical desc.
    - ordered
    - ordered reversed
  - language for bot messages (get from preferred language if community feature is active or from config file (override))
- Automatic creation of voice channel if there's no empty one available
- Allow users to add/remove themselves from roles via reactions
- Allow users to give themselves a custom role to set a custom color for their name
- Rotating server icon