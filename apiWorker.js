import yargs from 'yargs';
import pm2 from 'pm2';

yargs(process.argv.slice(2))
    .command(
        'scan-loop [action] [limit]',
        'Do run loop',
        (yargs) => {
            return yargs
                .positional('action', {
                    describe: 'start|stop',
                    default: 'start',
                }).positional('limit', {
                    describe: 'limit of count loop',
                    default: 1
                }).option('account', {
                    describe: 'account',
                    default: null
                }).option('fake-new-media', {
                    boolean: true,
                    default: false
                });
        },
        (yargs) => {
            console.log('Yargs', yargs.action, yargs.limit, yargs.fakeNewMedia, yargs.account);
        }
    )
    .parse();
