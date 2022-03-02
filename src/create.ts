import { CAC } from 'cac';

export default function (cli: CAC) {
  cli
    .command('create <name>', 'create a kokkoro plugin project')
    .action(name => {
      // TODO
    })
}