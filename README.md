
# shortcutting.xyz
# <img width="166" height="61" alt="image" src="https://github.com/user-attachments/assets/58975943-48de-42f6-a044-d9576f2485be" /> 
---
## About
[shortcutting.xyz](http://shortcutting.xyz) is a fun and gamified test for in-line editing skills. It features 3 engaging modes, a detailed results page, a global leaderboard, and public user profiles.

## Gamemodes
- target mode, where you are given a block of text and tasked to match the text to a target sample
- drill mode, where you are prompted to navigate text in a specific manner
- coding mode, which is target mode but with coding syntax and IDE typing behavior

## Screenshot
<img width="1506" height="767" alt="image" src="https://github.com/user-attachments/assets/290350f1-0579-4dd8-8bc7-f2f81be8cc23" />

## How it works

- a test consists of of run with multiple parts
- for target based modes, the final state of a given part must match the target state
- for drill mode, the final state must match the instruction given
- once states match, the test advances to the next part
- when a test is completed, results cleanly display your time and personal records

## Technical highlights
- desktop based web app with a custom editable surface and native editing behavior preserved, utilizing Next.js, React, TypeScript
- pure game logic is in `src/domain/` (generation, validation, diffing, timing, results)
- local first design that enables tracked guest play with future account import (`ResultLogger` abstraction)
- challenges are deterministic through seeded generation

## Contributions

if you like the game please feel free to fork this repository and make a pull request for any changes or improvements that you add!

## Inspiration

this project was inspired by monkeytype, I love using their site for typing practice, so naturally, once I decided I wnated to improve my keyboard maneuvering skills, I decided to build this.


## License
MIT
