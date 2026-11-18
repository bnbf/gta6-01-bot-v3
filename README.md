# gta6-01-bot-v3

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bnbf/gta6-01-bot-v3/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bnbf/gta6-01-bot-v3/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

LUMEN BAY: Neon Heat — open-world crime in a neon coastal city: 7 story missions, police helicopter, 4 weapons, car radio, shops, safehouse, NOS, saves. Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

You are Milo Kade, a wheelman in Lumen Bay — a coastal city where golden dusk (18:40) falls into neon night (20:00). Light is the visual: glowing neon signs, street lamps, car headlights, and a pool of light around you. Steal cars, outrun the Lumen PD through 5 wanted stars, dodge the police helicopter's spotlight from 4 stars, run 7 story missions for Vera Solano and Big Lou, and take the crown as King of the Bay.

Features: 7 story missions (First Wheels, Neon Courier, Protection Money, Heat Wave, The Big Score, Midnight Race, King of the Bay), police helicopter (shootable, +$500), 4 weapons (pistol, SMG, shotgun, rifle), car radio with 2 procedural WebAudio synthwave stations, shops (gun shop, diner, garage repair + NOS), safehouse (heal + save), drive-by shooting, car damage and smoke, street race side job, taxi fares, stealable parked cars, traffic and pedestrians, HUD with live minimap, localStorage autosave, WebAudio sound effects. Original city, characters, and story — nothing from Rockstar Games.

## Run it

```sh
cd game
python3 -m http.server 8123
# open http://localhost:8123 in a browser
# self-test: http://localhost:8123/?test=1
```

Controls: WASD drive / walk, E enter car or interact, mouse aim + click to shoot, Shift NOS / run, R radio, Q radio station, 1–4 switch weapon, P pause, M mute. No build step, no network requests — plain static files. Screenshots in `screenshots/` are real renders of the game's own code.

<sub>Entered on [make.fun](https://make.fun/?ref=bsqaxrmg&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
