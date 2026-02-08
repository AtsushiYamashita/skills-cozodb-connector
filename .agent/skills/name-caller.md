---
name: name-caller # Optionally(Defaiult:fldername)
uuid: 2bb44ce6-35eb-40d2-9ea9-8ca6ccec0b68 # Optionally
description: Call my name # If you want to specific use, you can append uuid by name.
---

# My Skill

Ask user whoami or find user name from command. instructions for the agent go here.

## Value definition (With L11n)

$AskName.en="Please tell me your name."
$AskName.jp="名前を教えてください。."

## When to use this skill

- Exec `whoami` on terminal
- When it failed, say $AskName
- Rpeat it.

## How to use it

Step-by-step guidance, conventions, and patterns the agent should follow.
