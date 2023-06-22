"use strict";(self.webpackChunkdocusaurus=self.webpackChunkdocusaurus||[]).push([[796],{3905:(e,t,n)=>{n.d(t,{Zo:()=>d,kt:()=>m});var a=n(7294);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function r(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?r(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):r(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,a,i=function(e,t){if(null==e)return{};var n,a,i={},r=Object.keys(e);for(a=0;a<r.length;a++)n=r[a],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);for(a=0;a<r.length;a++)n=r[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var s=a.createContext({}),p=function(e){var t=a.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},d=function(e){var t=p(e.components);return a.createElement(s.Provider,{value:t},e.children)},c="mdxType",h={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},u=a.forwardRef((function(e,t){var n=e.components,i=e.mdxType,r=e.originalType,s=e.parentName,d=l(e,["components","mdxType","originalType","parentName"]),c=p(n),u=i,m=c["".concat(s,".").concat(u)]||c[u]||h[u]||r;return n?a.createElement(m,o(o({ref:t},d),{},{components:n})):a.createElement(m,o({ref:t},d))}));function m(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var r=n.length,o=new Array(r);o[0]=u;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l[c]="string"==typeof e?e:i,o[1]=l;for(var p=2;p<r;p++)o[p]=n[p];return a.createElement.apply(null,o)}return a.createElement.apply(null,n)}u.displayName="MDXCreateElement"},2433:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>s,contentTitle:()=>o,default:()=>h,frontMatter:()=>r,metadata:()=>l,toc:()=>p});var a=n(7462),i=(n(7294),n(3905));const r={},o="Contribute",l={unversionedId:"dev",id:"dev",title:"Contribute",description:"Set up development environment",source:"@site/docs/dev.md",sourceDirName:".",slug:"/dev",permalink:"/starknet-hardhat-plugin/docs/dev",draft:!1,editUrl:"https://github.com/0xSpaceShard/starknet-hardhat-plugin/tree/master/docs/docs/dev.md",tags:[],version:"current",frontMatter:{}},s={},p=[{value:"Set up development environment",id:"set-up-development-environment",level:2},{value:"Clone the repository",id:"clone-the-repository",level:3},{value:"Install dependencies",id:"install-dependencies",level:3},{value:"Compile",id:"compile",level:3},{value:"Set up the example repository",id:"set-up-the-example-repository",level:3},{value:"Testing",id:"testing",level:2},{value:"Executing tests locally",id:"executing-tests-locally",level:3},{value:"Executing individual tests",id:"executing-individual-tests",level:3},{value:"Executing individual tests with dockerized environnement",id:"executing-individual-tests-with-dockerized-environnement",level:3},{value:"Running tests in dev mode",id:"running-tests-in-dev-mode",level:3},{value:"Executing tests on CircleCI",id:"executing-tests-on-circleci",level:3},{value:"Testing network",id:"testing-network",level:3},{value:"Creating a PR",id:"creating-a-pr",level:3},{value:"Adapting to a new Starknet / cairo-lang version",id:"adapting-to-a-new-starknet--cairo-lang-version",level:2},{value:"In cairo-cli repo",id:"in-cairo-cli-repo",level:3},{value:"In starknet-hardhat-example repo",id:"in-starknet-hardhat-example-repo",level:3},{value:"Architecture",id:"architecture",level:2},{value:"Wrapper",id:"wrapper",level:3},{value:"Accessing HardhatRuntimeEnvironment (hre)",id:"accessing-hardhatruntimeenvironment-hre",level:3},{value:"Version management",id:"version-management",level:2},{value:"Docs",id:"docs",level:3},{value:"Example repo after a new version",id:"example-repo-after-a-new-version",level:3}],d={toc:p},c="wrapper";function h(e){let{components:t,...n}=e;return(0,i.kt)(c,(0,a.Z)({},d,n,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"contribute"},"Contribute"),(0,i.kt)("h2",{id:"set-up-development-environment"},"Set up development environment"),(0,i.kt)("h3",{id:"clone-the-repository"},"Clone the repository"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre"},"$ git clone git@github.com:0xSpaceShard/starknet-hardhat-plugin.git\n$ cd starknet-hardhat-plugin\n")),(0,i.kt)("h3",{id:"install-dependencies"},"Install dependencies"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre"},"$ npm ci\n")),(0,i.kt)("h3",{id:"compile"},"Compile"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre"},"$ npm run build\n")),(0,i.kt)("h3",{id:"set-up-the-example-repository"},"Set up the example repository"),(0,i.kt)("p",null,"The ",(0,i.kt)("inlineCode",{parentName:"p"},"starknet-hardhat-example")," repository is used to showcase and test this plugin's functionality.\nSet it up following ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/starknet-hardhat-example#get-started"},"its readme"),", but after installing it, link it to use your local plugin repository:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre"},"$ cd <YOUR_PLUGIN_REPO_PATH>\n$ npm link\n\n$ cd <YOUR_EXAMPLE_REPO_PATH>\n$ npm link @shardlabs/starknet-hardhat-plugin\n")),(0,i.kt)("p",null,"If your IDE is reporting Typescript issues after compiling the plugin, you may want to restart the Typescript language server (e.g. in VS Code on Linux: Ctrl+Shift+P)"),(0,i.kt)("h2",{id:"testing"},"Testing"),(0,i.kt)("p",null,"A test case is added by creating a directory in a subdirectory of a test group in the ",(0,i.kt)("inlineCode",{parentName:"p"},"test")," directory. E.g. ",(0,i.kt)("inlineCode",{parentName:"p"},"declare-test")," is a test case in the ",(0,i.kt)("inlineCode",{parentName:"p"},"general-tests")," test group. A test case should contain:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"a ",(0,i.kt)("inlineCode",{parentName:"li"},"check.ts")," script which does the testing logic"),(0,i.kt)("li",{parentName:"ul"},"a ",(0,i.kt)("inlineCode",{parentName:"li"},"network.json")," file which specifies on which networks should the test case be run"),(0,i.kt)("li",{parentName:"ul"},"a ",(0,i.kt)("inlineCode",{parentName:"li"},"hardhat.config.ts")," file will be used")),(0,i.kt)("p",null,"The main testing script is ",(0,i.kt)("inlineCode",{parentName:"p"},"scripts/test.ts"),". It iterates over the test cases the test group specified by the ",(0,i.kt)("inlineCode",{parentName:"p"},"TEST_SUBDIR")," environment variable."),(0,i.kt)("h3",{id:"executing-tests-locally"},"Executing tests locally"),(0,i.kt)("p",null,"When running tests locally, you probably don't want to run the whole ",(0,i.kt)("inlineCode",{parentName:"p"},"test.sh")," script as it may alter your development environment. However, you can run individual tests by:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"positioning yourself in your example repository"),(0,i.kt)("li",{parentName:"ul"},"configuring the ",(0,i.kt)("inlineCode",{parentName:"li"},"hardhat.config.ts")),(0,i.kt)("li",{parentName:"ul"},"executing the ",(0,i.kt)("inlineCode",{parentName:"li"},"check.ts")," script (potentially modifying it to address path differences)")),(0,i.kt)("p",null,"To run all tests, you can use the ",(0,i.kt)("inlineCode",{parentName:"p"},"test-")," scripts defined in ",(0,i.kt)("inlineCode",{parentName:"p"},"package.json"),". For the tests to work, you may need to set the values from ",(0,i.kt)("inlineCode",{parentName:"p"},"config.json")," as environment variables. You should also have the ",(0,i.kt)("a",{parentName:"p",href:"https://stedolan.github.io/jq/"},(0,i.kt)("inlineCode",{parentName:"a"},"jq")," CLI tool")," installed."),(0,i.kt)("h3",{id:"executing-individual-tests"},"Executing individual tests"),(0,i.kt)("p",null,"To run a specific test case in the test group you can pass in the name of directory inside test group. E.g. to run ",(0,i.kt)("inlineCode",{parentName:"p"},"declare-test")," test case in ",(0,i.kt)("inlineCode",{parentName:"p"},"general-tests")," test group, you can use the script\n",(0,i.kt)("inlineCode",{parentName:"p"},"test-general-tests")," and pass in the name of the test after a ",(0,i.kt)("inlineCode",{parentName:"p"},"--")," like this,"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-sh"},"$ npm run test-general-tests -- declare-test\n")),(0,i.kt)("h3",{id:"executing-individual-tests-with-dockerized-environnement"},"Executing individual tests with dockerized environnement"),(0,i.kt)("p",null,"If you are only running Devnet in dockerized mode, you don't need to install all the dev tools locally. With a properly set up ",(0,i.kt)("inlineCode",{parentName:"p"},"starknet-hardhat-example")," (read more ",(0,i.kt)("a",{parentName:"p",href:"#Set-up-the-example-repository"},"here"),"), you can position yourself in that repository and to execute the ",(0,i.kt)("inlineCode",{parentName:"p"},"declare-test")," case of the ",(0,i.kt)("inlineCode",{parentName:"p"},"general-tests")," group, you can run:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-sh"},"$ npx ts-node STARKNET_HARDHAT_PLUGIN_PATH/test/general-tests/declare-test/check.ts\n")),(0,i.kt)("p",null,"Using this command will use the starknet-hardhat-example hardhat.config.ts. You can make modifications to make it match the config file in the test directory ",(0,i.kt)("inlineCode",{parentName:"p"},"STARKNET_HARDHAT_PLUGIN_PATH/test/general-tests/declare-test/hardhat.config.ts")),(0,i.kt)("h3",{id:"running-tests-in-dev-mode"},"Running tests in dev mode"),(0,i.kt)("p",null,"To run tests locally with test-dev. This is designed to run same tests repeatedly while developing."),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-sh"},"$ npm run test-dev\n")),(0,i.kt)("h3",{id:"executing-tests-on-circleci"},"Executing tests on CircleCI"),(0,i.kt)("p",null,"If you're a member of the organization and you do a push to origin, you trigger CI/CD workflow on CircleCI. Track the progress on ",(0,i.kt)("a",{parentName:"p",href:"https://circleci.com/gh/0xSpaceShard/workflows/starknet-hardhat-plugin"},"the dashboard"),"."),(0,i.kt)("p",null,"Sometimes the tests fail because of internal CircleCI or Starknet issues; in that case, you can try restarting the workflow."),(0,i.kt)("p",null,"Bear in mind that each workflow consumes credits. Track the spending ",(0,i.kt)("a",{parentName:"p",href:"https://app.circleci.com/settings/plan/github/0xSpaceShard/overview"},"here"),"."),(0,i.kt)("p",null,"The whole workflow is defined in ",(0,i.kt)("inlineCode",{parentName:"p"},".circleci/config.yml")," - you may find it somewhat chaotic as it uses dependency caching (we kind of sacrificed config clarity for performance)."),(0,i.kt)("p",null,"Script ",(0,i.kt)("inlineCode",{parentName:"p"},"scripts/set-alpha-vars.sh")," expects account information to be set through environment variables. These variables are defined in ",(0,i.kt)("a",{parentName:"p",href:"https://app.circleci.com/settings/organization/github/0xSpaceShard/contexts/c36fa213-2511-465b-b303-0d35d76b42eb"},"spaceshard CircleCI context"),". If you upload a new account (with new keys), you cannot modify existing variables but have to delete old ones and create new ones."),(0,i.kt)("p",null,"To skip running tests on CircleCI, add ",(0,i.kt)("inlineCode",{parentName:"p"},"[skip ci]")," in the first 250 characters of the commit message."),(0,i.kt)("h3",{id:"testing-network"},"Testing network"),(0,i.kt)("p",null,"The script ",(0,i.kt)("inlineCode",{parentName:"p"},"test.sh")," runs tests on Devnet and Testnet (alpha-goerli). To skip running tests on Testnet, add ",(0,i.kt)("inlineCode",{parentName:"p"},"[skip testnet]")," to the commit message."),(0,i.kt)("h3",{id:"creating-a-pr"},"Creating a PR"),(0,i.kt)("p",null,"When adding new functionality to the plugin, you will probably also have to create a PR to the ",(0,i.kt)("inlineCode",{parentName:"p"},"plugin")," branch of ",(0,i.kt)("inlineCode",{parentName:"p"},"starknet-hardhat-example"),". You can then modify the ",(0,i.kt)("inlineCode",{parentName:"p"},"test.sh")," script to use your branch instead of the ",(0,i.kt)("inlineCode",{parentName:"p"},"plugin")," branch."),(0,i.kt)("p",null,"If your reviewer makes an observation that requires a fix, after you push the commit with the fix, find the commit link on the PR conversation page, and reply to the reviewer by providing that link. In ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/starknet-hardhat-plugin/pull/130#discussion_r913581807"},"this example")," the contributor even linked to the specific change of the commit - you don't have to do that if you made multiple smaller commits."),(0,i.kt)("p",null,"When the PR is ready to be merged, do ",(0,i.kt)("inlineCode",{parentName:"p"},"Squash and merge")," and delete the branch."),(0,i.kt)("h2",{id:"adapting-to-a-new-starknet--cairo-lang-version"},"Adapting to a new Starknet / cairo-lang version"),(0,i.kt)("p",null,"Since the plugin relies on ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/starknet-devnet"},"Devnet")," in its tests, first an adapted version of Devnet might need to be released. Current versions of Devnet and cairo-lang used in tests are specified in ",(0,i.kt)("inlineCode",{parentName:"p"},"config.json"),"."),(0,i.kt)("h3",{id:"in-cairo-cli-repo"},"In cairo-cli repo"),(0,i.kt)("p",null,"When a new Starknet / cairo-lang version is released, a new ",(0,i.kt)("inlineCode",{parentName:"p"},"cairo-cli")," Docker image can be released (probably without any adaptation). This is done through the CI/CD pipeline of ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/cairo-cli-docker#build-a-new-image"},"the cairo-cli-docker repository"),"."),(0,i.kt)("p",null,"Likely places where the old version has to be replaced with the new version are ",(0,i.kt)("inlineCode",{parentName:"p"},"README.md")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"constants.ts"),"."),(0,i.kt)("h3",{id:"in-starknet-hardhat-example-repo"},"In starknet-hardhat-example repo"),(0,i.kt)("p",null,"Change the version in ",(0,i.kt)("inlineCode",{parentName:"p"},"hardhat.config.ts"),". Recompile the contracts (only important for local usage)."),(0,i.kt)("h2",{id:"architecture"},"Architecture"),(0,i.kt)("h3",{id:"wrapper"},"Wrapper"),(0,i.kt)("p",null,"This plugin is a wrapper around Starknet CLI (tool installed with cairo-lang). E.g. when you do ",(0,i.kt)("inlineCode",{parentName:"p"},"hardhat starknet-compile-deprecated")," in a shell or ",(0,i.kt)("inlineCode",{parentName:"p"},"contractFactory.deploy()")," in a Hardhat JS/TS script, you are making a subprocess that executes Starknet CLI's ",(0,i.kt)("inlineCode",{parentName:"p"},"starknet deploy"),"."),(0,i.kt)("p",null,"There are two wrappers around Starknet CLI. They are defined in ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/starknet-hardhat-plugin/blob/master/src/starknet-wrappers.ts"},"starknet-wrapper.ts")," and both rely on a ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/starknet-hardhat-plugin/blob/master/src/starknet_cli_wrapper.py"},"proxy server")," that imports ",(0,i.kt)("inlineCode",{parentName:"p"},"main")," methods of ",(0,i.kt)("inlineCode",{parentName:"p"},"starknet")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"starknet-compile-deprecated")," and uses them to execute commands (this is a speedup since a subprocess importing the whole Starknet doesn't have to be spawned for each request)."),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"Docker wrapper:",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},"runs Starknet CLI in a Docker container"),(0,i.kt)("li",{parentName:"ul"},"the default option"))),(0,i.kt)("li",{parentName:"ul"},"Venv wrapper:",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},"for users that already have ",(0,i.kt)("inlineCode",{parentName:"li"},"cairo-lang")," installed"),(0,i.kt)("li",{parentName:"ul"},"faster than Docker wrapper - not necessarily true since Docker wrapper also started using a proxy server")))),(0,i.kt)("h3",{id:"accessing-hardhatruntimeenvironment-hre"},"Accessing HardhatRuntimeEnvironment (hre)"),(0,i.kt)("p",null,"Before v0.7.0 we didn't know how to export classes to users, since every class needed to have access to ",(0,i.kt)("inlineCode",{parentName:"p"},"hre"),", which was passed on in ",(0,i.kt)("inlineCode",{parentName:"p"},"extendEnvironment"),". After introducing dynamic ",(0,i.kt)("inlineCode",{parentName:"p"},"hre")," importing, exporting classes has become a possibility:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-typescript"},'const hre = await import("hardhat");\n')),(0,i.kt)("p",null,"In ",(0,i.kt)("inlineCode",{parentName:"p"},"types/starknet.ts"),", classes are specified using ",(0,i.kt)("inlineCode",{parentName:"p"},"typeof"),", e.g. ",(0,i.kt)("inlineCode",{parentName:"p"},"OpenZeppelinAccount: typeof OpenZeppelinAccount"),". However, exporting classes this way doesn't export their type."),(0,i.kt)("h2",{id:"version-management"},"Version management"),(0,i.kt)("p",null,"When a push is done to the ",(0,i.kt)("inlineCode",{parentName:"p"},"master")," branch and the version in ",(0,i.kt)("inlineCode",{parentName:"p"},"package.json")," differs from the one published on ",(0,i.kt)("inlineCode",{parentName:"p"},"npm"),", the release process is triggered."),(0,i.kt)("p",null,"The updating of ",(0,i.kt)("inlineCode",{parentName:"p"},"package.json")," doesn't have to be done directly, but can be done by running"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre"},"$ npm version <NEW_VERSION>\n")),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"NEW_VERSION")," can be anything documented ",(0,i.kt)("a",{parentName:"p",href:"https://docs.npmjs.com/cli/v8/commands/npm-version"},"here"),", but will most commonly be ",(0,i.kt)("inlineCode",{parentName:"p"},"patch"),"."),(0,i.kt)("p",null,"This will also update ",(0,i.kt)("inlineCode",{parentName:"p"},"package-lock.json"),", create a new commit, and create a new git tag."),(0,i.kt)("p",null,"You may want your version-bumping commit to contain the ",(0,i.kt)("inlineCode",{parentName:"p"},"[skip testnet]")," string (documented ",(0,i.kt)("a",{parentName:"p",href:"#testing-network"},"here"),") to avoid testing on alpha-goerli (may postpone the version release significantly, if it will ever pass at all)."),(0,i.kt)("p",null,"If for whatever reason the publishing workflow in CI/CD cannot be executed, the version can be released manually via ",(0,i.kt)("inlineCode",{parentName:"p"},"scripts/npm-publish.sh"),", just be sure to have an NPM access token and that you have the rights to publish."),(0,i.kt)("p",null,"Apart from ",(0,i.kt)("a",{parentName:"p",href:"https://www.npmjs.com/package/@shardlabs/starknet-hardhat-plugin?activeTab=versions"},"npm"),", releases are also tracked on ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/starknet-hardhat-plugin/releases"},"GitHub")," with ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/starknet-hardhat-plugin/tags"},"git tags"),". Notice the prepended ",(0,i.kt)("inlineCode",{parentName:"p"},"v")," in tag names."),(0,i.kt)("p",null,"After the npm package is released and the tag is pushed:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-bash"},"$ git push origin <TAG_NAME>\n")),(0,i.kt)("p",null,"the release can be made public ",(0,i.kt)("a",{parentName:"p",href:"https://github.com/0xSpaceShard/starknet-hardhat-plugin/releases/new"},"on GitHub"),". Automatic note generation can be used, augmented with usage and development changes (see past releases for reference)."),(0,i.kt)("p",null,"Users should be notified about the usage related changes. This can be done on Telegram, ",(0,i.kt)("a",{parentName:"p",href:"https://discord.com/channels/793094838509764618/912735106899275856"},"Discord"),", ",(0,i.kt)("a",{parentName:"p",href:"https://community.starknet.io/t/starknet-hardhat-plugin/67"},"Shamans")," etc."),(0,i.kt)("h3",{id:"docs"},"Docs"),(0,i.kt)("p",null,"New documentation is ",(0,i.kt)("strong",{parentName:"p"},"automatically")," deployed after publishing a new version with ",(0,i.kt)("inlineCode",{parentName:"p"},"scripts/npm-publish.sh")," (also part of CI/CD)."),(0,i.kt)("p",null,"To manually deploy new documentation, run:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-bash"},"$ cd www\n$ npm ci\n$ npm run deploy\n")),(0,i.kt)("h3",{id:"example-repo-after-a-new-version"},"Example repo after a new version"),(0,i.kt)("p",null,"After releasing a new plugin version, the ",(0,i.kt)("inlineCode",{parentName:"p"},"plugin")," branch of the example repo should be updated and pushed:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"package.json")," should be updated by running ",(0,i.kt)("inlineCode",{parentName:"li"},"npm install --save-exact @shardlabs/starknet-hardhat-plugin@<NEW_VERSION>")),(0,i.kt)("li",{parentName:"ul"},"The ",(0,i.kt)("inlineCode",{parentName:"li"},"master")," branch, which serves as reference to the users, should be synchronized with the ",(0,i.kt)("inlineCode",{parentName:"li"},"plugin")," branch. This can probably be done by doing ",(0,i.kt)("inlineCode",{parentName:"li"},"git reset plugin")," while on ",(0,i.kt)("inlineCode",{parentName:"li"},"master"),"."),(0,i.kt)("li",{parentName:"ul"},"Since you did ",(0,i.kt)("inlineCode",{parentName:"li"},"npm install"),", you may need to link again, as described ",(0,i.kt)("a",{parentName:"li",href:"#set-up-the-example-repository"},"initially"),".")))}h.isMDXComponent=!0}}]);