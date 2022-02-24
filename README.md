# ipc-spy

Spy on inter process comunication(IPC)

# What does it do?

It spys on ipc communications, by replacing the binary that is spawned with a
wrapper that logs all the communication while still forwrading the messages to
the original processes

## Usage

- clone this repo and cd into it
- deno run -A src/boss.ts $pathTotargetfile

Now the original executable is saved at `$cache/spy-folder/`, and the specified
path is replaced with the spy wrapper

The next step is to run the program that calls the target, when it spawns the
target, the messages will be logged to `$tmp/control_trace.log` and
`$tmp/puppet_trace.log`

Here is an example of spying on vim-coc<=>rust-analyzer comminucations
<img src="./ra-demo.gif"/>

## Cli

- `deno run -A src/boss.ts` => prints a list of currently spyied on executables
- `deno run -A src/boss.ts $target` => spys on target
- `deno run -A src/boss.ts restore $target` => restore the original target
- `prox.ts` location can be specified with `PROX` environment variable
