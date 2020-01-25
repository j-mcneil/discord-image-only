import { fromEvent, Subject } from 'rxjs';
import { tap, filter, flatMap, takeUntil, take } from 'rxjs/operators';
import * as discord from 'discord.js';
import * as R from 'ramda';

const token = process.env.DISCORD_BOT_TOKEN;
if(!token) {
  console.log('Could not find DISCORD_BOT_TOKEN in environment');
  process.kill(process.pid, 'SIGTERM');
}

process.on('SIGTERM', () =>  {
  unsubscribe$.next();
  console.log('Process terminated');
});

const client = new discord.Client();

const unsubscribe$ = new Subject();
const ready$ = fromEvent(client, 'ready');
const message$ = fromEvent(client, 'message');
const disconnect$ = fromEvent(client, 'disconnect');
disconnect$.pipe(take(1)).subscribe(unsubscribe$);

ready$.pipe(
  tap(() => console.log('ready')),
  flatMap(() => message$),
  filter(
    R.compose(
      R.not,
      R.any(R.identity),
      R.juxt([
        R.compose(
          R.equals(''),
          R.prop('content'),
        ),
        R.path(['author', 'bot']),
        R.compose(
          R.equals('dm'),
          R.path(['channel', 'type']),
        )
      ]),
    )
  ),
  takeUntil(unsubscribe$),
).subscribe(message => {
  message.delete();
  const channelMention = message.guild.channels.get(message.channel.id).toString();
  message.author.send(`Channel ${ channelMention } only allows image content.`);
});

client.login(token);