# Netrun Breach · Code-Matrix Hacking

A hacking minigame for **Cyberpunk RED** in Foundry VTT (v12).

**Install:** paste this manifest into *Install Module*:
```
https://raw.githubusercontent.com/samroaleksej-bit/night-city-map/netrun-breach/module.json
```

## How it plays
- The GM presses **Netrun breach** (terminal icon in the Token controls) and picks the netrunner, the floor's DV and what each daemon does.
- The player gets a code matrix. Start in the top row, then alternate: column of your last pick, row of your last pick, and so on.
- Every pick goes to the buffer. A daemon uploads when its codes stand in the buffer in a row.
- The timer starts on the first pick. The breach ends when all daemons are in, the buffer is full, time runs out or the runner jacks out.
- The result card goes to chat (whisper to GM and runner, or public — module setting).

## Cyberpunk RED rules
- **Interface rank** (read from the Netrunner role on the character, editable in the dialog): buffer = 4 + half the rank rounded up; time = 25 s + 4 s per rank − (DV − 6).
- **Floor DV** 6 / 8 / 10 / 12 / 14: grid 5×5 to 7×7, two to three daemons of 2–5 codes.
- Every daemon can always be completed; at higher DV not all of them fit into one buffer.
- No daemon uploaded = the floor's ICE noticed the runner; what happens next is up to the GM.

Macro: `NetBreach.start({ user: "<userId>", dv: 10, rank: 6, names: ["Backdoor", "Eye-Dee", "Control"] })`

## Русский
Мини-игра на взлом для Cyberpunk RED. Мастер жмёт кнопку **«Взлом · нетраннинг»** (значок терминала в панели токенов), выбирает нетраннера, DV этажа и что даёт каждый демон. У игрока открывается код-матрица: первый код из верхней строки, дальше по очереди столбец и строка последнего выбора. Демон загружен, когда его коды стоят в буфере подряд. Ранг Interface даёт размер буфера и время, DV этажа — размер сетки и демонов. Итог — карточкой в чат.

Unofficial fan project, free and non-commercial. Cyberpunk RED is a trademark of R. Talsorian Games.
