const {exec} = require('child_process');
const {expect} = require('chai');
const chalk = require('chalk');

let commandPrefix = 'node ./node_modules/.bin/cypress';

if (process.platform === 'win32') {
  commandPrefix = 'npx cypress';
}

const ICONS = (() => {
  if (process.platform !== 'win32' || process.env.CI || process.env.TERM === 'xterm-256color') {
    return {error: '✘', warning: '⚠', success: '✔', info: 'ⓘ', route: '⛗'};
  } else {
    return {error: 'x', warning: '!', success: '+', info: 'i', route: '~'};
  }
})();

const PADDING = '                    ';

const commandBase = (env = '') =>
  `${commandPrefix} run --env ${env} --headless --config video=false -s cypress/integration/`;

let lastRunOutput = '';
const runTest = async (command, callback) => {
  await new Promise(resolve => {
    exec(command, (error, stdout, stderr) => {
      if (stderr) {
        console.error(stderr);
      }

      let from = stdout.indexOf('Running:  ');
      let to = stdout.lastIndexOf('(Results)');
      stdout = stdout.slice(from, to);

      lastRunOutput = stdout;
      // Normalize line endings for unix.
      callback(error, stdout.replace(/\r\n/g, "\n"), stderr);

      resolve();
    });
  });
};

describe('cypress-terminal-report', () => {

  afterEach(function () {
    if (this.currentTest.state == 'failed') {
      console.log(chalk.yellow('-- Cypress output start --\n\n'));
      console.log(lastRunOutput);
      console.log(chalk.yellow('-- Cypress output end --\n\n\n\n'));
    }
  });

  it('Should run happy flow.', async () => {
    await runTest(commandBase() + 'happyFlow.spec.js', (error, stdout, stderr) => {
      // cy.command logs.
      expect(stdout).to.contain(`cy:command ${ICONS.success}  visit\t/commands/network-requests\n`);
      expect(stdout).to.contain(`cy:command ${ICONS.success}  get\t.network-post\n`);
      expect(stdout).to.contain(
        `cy:xhr ${ICONS.info}  STUBBED PUT https://jsonplaceholder.cypress.io/comments/1\n`
      );
      // cy.route logs.
      expect(stdout).to.contain(`cy:route ${ICONS.route}`);
      expect(stdout).to.contain(`Status: 200 (getComment)\n`);
      expect(stdout).to.contain(`Method: GET\n`);
      expect(stdout).to.contain(`Url: https://jsonplaceholder.cypress.io/comments/1\n`);
      expect(stdout).to.contain(
        `Response: {\n${PADDING}  "postId": 1,\n${PADDING}  "id": 1,\n${PADDING}  "name": "id labore ex et quam laborum",\n${PADDING}  "email": "Eliseo@gardner.biz",\n${PADDING}  "body": "laudantium enim quasi est quidem magnam voluptate ipsam eos\\ntempora quo necessitatibus\\ndolor quam autem quasi\\nreiciendis et nam sapiente accusantium"\n${PADDING}}\n`
      );
      // console
      expect(stdout).to.contain(`cons:warn ${ICONS.warning}  This is a warning message\n`);
      expect(stdout).to.contain(`cons:error ${ICONS.warning}  This is an error message\n`);
      expect(stdout).to.contain(`cons:error ${ICONS.warning}  Error: This is an error message with stack.\n${PADDING}    at Context.<anonymous> (https://example.cypress.io/__cypress/tests?p=`);
      expect(stdout).to.contain(`cons:log ${ICONS.info}  This should console.log appear.`);
      expect(stdout).to.contain(`cons:log ${ICONS.info}  {\n${PADDING}  "this": "Is an object",\n${PADDING}  "with": {\n${PADDING}    "keys": 12512\n${PADDING}  }\n${PADDING}}\n`);
      expect(stdout).to.contain(`cons:log ${ICONS.info}  {\n${PADDING}  "a": "b"\n${PADDING}},\n${PADDING}{\n${PADDING}  "c": "d"\n${PADDING}},\n${PADDING}10,\n${PADDING}string\n`);
      expect(stdout).to.contain(`cons:error ${ICONS.warning}  null,\n${PADDING}undefined,\n${PADDING},\n${PADDING}false,\n${PADDING}function () {}\n`);
      expect(stdout).to.contain(`cons:info ${ICONS.info}  This should console.info appear.`);
      // log failed command
      expect(stdout).to.contain(`cy:command ${ICONS.error}  get\t.breaking-get\n`);
    });
  }).timeout(60000);

  it('Logs FETCH API routes.', async () => {
    await runTest(commandBase() + 'apiRoutes.spec.js', (error, stdout, stderr) => {
      expect(stdout).to.contain(`Method: PUT\n`);
      expect(stdout).to.contain(`Url: https://example.cypress.io/comments/10\n`);
      // cy.route empty body.
      expect(stdout).to.contain(`cy:route ${ICONS.route}`);
      expect(stdout).to.contain(`Status: 200 (getComment)\n`);
      expect(stdout).to.contain(`Response: EMPTY_BODY\n`);
      // cy.route text.
      expect(stdout).to.contain(`cy:route ${ICONS.route}`);
      expect(stdout).to.contain(`Status: 403 (putComment)\n`);
      expect(stdout).to.contain(`Response: This is plain text data.\n`);
      // cy.route unknown.
      expect(stdout).to.contain(`cy:route ${ICONS.route}`);
      expect(stdout).to.contain(`Status: 401 (putComment)\n`);
      expect(stdout).to.contain(`Response: UNKNOWN_BODY\n`);
      // cy.route logs.
      expect(stdout).to.contain(`cy:route ${ICONS.route}`);
      expect(stdout).to.contain(`Status: 404 (putComment)\n`);
      expect(stdout).to.contain(`Response: {"error":"Test message."}\n`);
      // log failed command
      expect(stdout).to.contain(`cy:command ${ICONS.error}  get\t.breaking-get\n`);
    });
  }).timeout(60000);

  it('Logs cy.requests', async () => {
    await runTest(commandBase() + `requests.spec.js`, (error, stdout, stderr) => {
      expect(stdout).to.contain(
        `cy:request ${ICONS.success}  https://jsonplaceholder.cypress.io/todos/1\n${PADDING}Status: 200\n${PADDING}Response: {\n${PADDING}  "userId": 1,\n${PADDING}  "id": 1,\n${PADDING}  "title": "delectus aut autem",\n${PADDING}  "completed": false\n${PADDING}}`
      );
      expect(stdout).to.contain(
        `cy:request ${ICONS.success}  GET https://jsonplaceholder.cypress.io/todos/2\n${PADDING}Status: 200\n${PADDING}Response: {\n${PADDING}  "userId": 1,\n${PADDING}  "id": 2,\n${PADDING}  "title": "quis ut nam facilis et officia qui",\n${PADDING}  "completed": false\n${PADDING}}`
      );
      expect(stdout).to.contain(
        `cy:request ${ICONS.success}  GET https://jsonplaceholder.cypress.io/todos/3\n${PADDING}Status: 200\n${PADDING}Response: {\n${PADDING}  "userId": 1,\n${PADDING}  "id": 3,\n${PADDING}  "title": "fugiat veniam minus",\n${PADDING}  "completed": false\n${PADDING}}`
      );
      expect(stdout).to.contain(
        `cy:request ${ICONS.success}  POST https://jsonplaceholder.cypress.io/comments\n${PADDING}Status: 201\n${PADDING}Response: {\n${PADDING}  "id": 501\n${PADDING}}\n`
      );
      // log failed command
      expect(stdout).to.contain(
        `cy:request ${ICONS.error}  PUT https://jsonplaceholder.cypress.io/comments\n${PADDING}Status: 404 - Not Found\n${PADDING}Response: {}\n`
      );

      expect(stdout).to.contain(
        `cy:request ${ICONS.error}  GET https://cypress.free.beeceptor.com/response500\n${PADDING}Status: 500 - Server Error\n${PADDING}Response: Hey ya! Great to see you here. Btw, nothing is configured for this request path. Create a rule and start building a mock API.\n`
      );

      expect(stdout).to.contain(
        `cy:request ${ICONS.error}  POST https://cypress.free.beeceptor.com/create/object/fail\n${PADDING}Status: 400 - Bad Request\n${PADDING}Response: {\n${PADDING}  "status": "Wrong!",\n${PADDING}  "data": {\n${PADDING}    "corpo": "corpo da resposta",\n${PADDING}    "titulo": "titulo da resposta"\n${PADDING}  }\n${PADDING}}\n`
      );
    });
  }).timeout(60000);

  it('Should properly set the breaking command in logs.', async () => {
    await runTest(commandBase() + `waitFail.spec.js`, (error, stdout, stderr) => {
      expect(stdout).to.contain(`cy:command ${ICONS.error}  get\t.breaking-wait`);
      expect(stdout).to.not.contain(`cy:route ${ICONS.error}`);
      expect(stdout).to.contain(`cy:route ${ICONS.route}  Status: 200`);
    });
  }).timeout(60000);

  it('Should always print logs when configuration enabled.', async () => {
    await runTest(commandBase('printLogsAlways=1') + 'alwaysPrintLogs.spec.js', (error, stdout, stderr) => {
      // cy.command logs.
      expect(stdout).to.contain(`cy:command ${ICONS.success}  visit\t/\n`);
      expect(stdout).to.contain(`cy:command ${ICONS.success}  contains\tcypress\n`);
    });
  }).timeout(60000);

  it('Should print only logs allowed if configuration added.', async () => {
    await runTest(commandBase('setLogTypes=1') + 'allTypesOfLogs.spec.js', (error, stdout, stderr) => {
      expect(stdout).to.contain(`cy:request`);
      expect(stdout).to.contain(`cy:log`);
      expect(stdout).to.contain(`cons:warn`);

      expect(stdout).to.not.contain(`cy:route`);
      expect(stdout).to.not.contain(`cy:command`);
      expect(stdout).to.not.contain(`cons:error`);
      expect(stdout).to.not.contain(`cons:log`);
      expect(stdout).to.not.contain(`cons:info`);
    });
  }).timeout(60000);

  it('Should filter logs if configuration added.', async () => {
    await runTest(commandBase('setFilterLogs=1') + 'allTypesOfLogs.spec.js', (error, stdout, stderr) => {
      expect(stdout).to.contain(`This should console.log appear. [filter-out-string]`);
      expect(stdout).to.contain(`This is a cypress log. [filter-out-string]`);
      expect(stdout).to.contain(`.breaking-get [filter-out-string]`);

      expect(stdout).to.not.contain(`cy:route`);
      expect(stdout).to.not.contain(`cy:request`);
      expect(stdout).to.not.contain(`cons:error`);
      expect(stdout).to.not.contain(`cons:warn`);
      expect(stdout).to.not.contain(`cons:info`);
    });
  }).timeout(60000);
});
