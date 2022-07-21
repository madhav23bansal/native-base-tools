#! /usr/bin/env node

require("dotenv").config();
const { Octokit } = require("@octokit/rest");
const { spawn } = require("child_process");
const prompts = require("prompts");

const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });
const getBranchPath = __dirname + "/get-branch.sh";

let currentBranch;
let remoteData;

function createPullRequest() {
  setRemoteDataAndCheckForEnv();
}

function setRemoteDataAndCheckForEnv() {
  var ls = spawn("git", ["remote", "-v"]);

  ls.stdout.on("data", function (data) {
    remoteData = JSON.stringify(`${data}`);
  });
  ls.stderr.on("data", (data) => {
    console.log(`error: ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    if (remoteData.includes("github.com")) {
      if (!process.env.GITHUB_PERSONAL_TOKEN) {
        console.error("Please check GITHUB_PERSONAL_TOKEN in your env file");
        return;
      }
    }
    getCurrentBranch();
  });
}

function getCurrentBranch() {
  var ls = spawn("sh", [getBranchPath]);
  ls.stdout.on("data", function (data) {
    currentBranch = `${data}`;
  });
  ls.stderr.on("data", (data) => {
    console.log(`stderr: getcurrent ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    promptQuestions();
  });
}

async function promptQuestions() {
  let choice;

  let subOptions = [
    { title: "Patch", value: "patch" },
    { title: "Minor", value: "minor" },
    { title: "Canary-Patch", value: "canary-patch" },
    { title: "Canary-Minor", value: "canary-minor" },
    { title: "Master", value: "master" },
  ];

  let subPromptsConfig = [
    {
      type: "select",
      name: "value",
      message: "Where do you want to create a PR?",
      choices: subOptions,
      initial: 0,
    },
  ];

  const response = await prompts(subPromptsConfig);
  choice = response.value;
  createPR(choice);
}
function createPR(choice) {
  if (remoteData.includes("github.com")) {
    let owner;
    let repo;
    let remoteSample = remoteData.match(/\:([^)]+)\./).pop();

    if (remoteSample.includes("github.com")) {
      let gitVariables = remoteSample.split("/");
      owner = gitVariables[3].trim();
      repo = gitVariables[4].trim();
    } else {
      let gitVariables = remoteSample.split("/");
      owner = gitVariables[0].trim();
      repo = gitVariables[1].trim();
    }

    let prTitle = `${currentBranch}`;
    let base = choice;
    let head = currentBranch.toString().trim();
    pushToGithub(repo, owner, prTitle, base, head);
  }
}

function pushToGithub(repo, owner, prTitle, base, head) {
  var ls = spawn("git", ["push", "origin", head]);
  ls.stdout.on("data", function (data) {
    console.log(`stdout on ${data}`);
  });
  ls.stderr.on("data", (data) => {
    console.log(`stderr:  pushtogit ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    console.log("Pushed to Github");
    createPRforGithub(repo, owner, prTitle, base, head);
  });
}

function createPRforGithub(repo, owner, title, base, head) {
  octokit.rest.pulls.create({
    owner: owner,
    repo: repo,
    title: title,
    base: base,
    head: head,
  });
  console.log("Created PR!");
}

module.exports.createPullRequest = createPullRequest;
