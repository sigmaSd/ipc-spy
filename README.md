# IPC-Spy

Spy on inter process comunication(IPC)

## What does it do?

It spys on ipc communications, by replacing the binary that is spawned with a
wrapper that logs all the communication while still forwrading the messages to
the original processes

## Install

`deno install -A https://raw.githubusercontent.com/sigmaSd/ipc-spy/stream/src/boss.ts`

## Usage

`boss $pathTotargetfile`

Now the original executable is saved at `$cache/spy-folder/`, and the specified
path is replaced with the spy wrapper

The next step is to run the program that calls the target, when it spawns the
target, the messages will be logged to `$tmp/${executable_name}_stdin.log` and
`$tmp/${executable_name_stdout}.log`

** Example **

[Screencast from 2024-03-23 08-34-54.webm](https://github.com/sigmaSd/ipc-spy/assets/22427111/562e5b66-f184-4a6c-b3a7-a963758589ea)

## Cli

- `boss` => prints a list of currently spyied on executables
- `boss.ts $target` => spys on target
- `boss.ts restore $target` => restore the original target
